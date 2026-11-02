// Package store manages the local SQLite database that keeps the cashier
// fully functional without internet. Products and cashier settings are a
// synced cache of the server; orders/shifts are created here first and
// pushed to the server by the syncer.
package store

import (
	"database/sql"
	"os"
	"path/filepath"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type Store struct {
	mu sync.Mutex
	db *sql.DB
}

// Open creates (if needed) and opens the local database under
// %APPDATA%/ray-cashier/cashier.db.
func Open() (*Store, error) {
	cfgDir, err := os.UserConfigDir()
	if err != nil {
		cfgDir = "."
	}
	dir := filepath.Join(cfgDir, "ray-cashier")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", filepath.Join(dir, "cashier.db")+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS settings (
	key   TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
	id          TEXT PRIMARY KEY,
	name        TEXT NOT NULL,
	price       REAL NOT NULL DEFAULT 0,
	stock       INTEGER NOT NULL DEFAULT 0,
	category    TEXT NOT NULL DEFAULT '',
	image_url   TEXT,
	is_active   INTEGER NOT NULL DEFAULT 1,
	track_stock INTEGER NOT NULL DEFAULT 1,
	barcode     TEXT,
	updated_at  TEXT
);
CREATE TABLE IF NOT EXISTS pos_shifts (
	id              TEXT PRIMARY KEY,
	remote_id       TEXT,
	opened_by_id    TEXT,
	opened_by_name  TEXT,
	opening_amount  REAL NOT NULL DEFAULT 0,
	closing_amount  REAL,
	expected_amount REAL,
	difference      REAL,
	total_sales     REAL NOT NULL DEFAULT 0,
	orders_count    INTEGER NOT NULL DEFAULT 0,
	status          TEXT NOT NULL DEFAULT 'open',
	note            TEXT,
	opened_at       TEXT NOT NULL,
	closed_at       TEXT,
	synced          INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
	id             TEXT PRIMARY KEY,
	remote_id      TEXT,
	shift_id       TEXT NOT NULL,
	total          REAL NOT NULL DEFAULT 0,
	subtotal       REAL NOT NULL DEFAULT 0,
	discount       REAL NOT NULL DEFAULT 0,
	payment_method TEXT NOT NULL DEFAULT 'COD',
	status         TEXT NOT NULL DEFAULT 'CONFIRMED',
	customer_name  TEXT,
	customer_phone TEXT,
	notes          TEXT,
	cashier_id     TEXT,
	cashier_name   TEXT,
	created_at     TEXT NOT NULL,
	synced         INTEGER NOT NULL DEFAULT 0,
	sync_error     TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
	id        TEXT PRIMARY KEY,
	order_id  TEXT NOT NULL,
	product_id TEXT NOT NULL,
	name      TEXT NOT NULL,
	quantity  REAL NOT NULL DEFAULT 1,
	price     REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS cash_movements (
	id         TEXT PRIMARY KEY,
	shift_id   TEXT NOT NULL,
	kind       TEXT NOT NULL,
	amount     REAL NOT NULL DEFAULT 0,
	note       TEXT,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS held_orders (
	id         TEXT PRIMARY KEY,
	label      TEXT,
	payload    TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
`)
	return err
}

func now() string { return time.Now().UTC().Format(time.RFC3339) }

// ─── settings (key/value JSON blobs) ────────────────────────────────────────

func (s *Store) GetSetting(key string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var v string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&v)
	if err != nil {
		return "", false
	}
	return v, true
}

func (s *Store) SetSetting(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO settings(key, value) VALUES(?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value)
	return err
}

func (s *Store) DeleteSetting(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`DELETE FROM settings WHERE key = ?`, key)
	return err
}

// ─── products (synced cache) ────────────────────────────────────────────────

type Product struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Price      float64  `json:"price"`
	Stock      int      `json:"stock"`
	Category   string   `json:"category"`
	ImageURL   *string  `json:"imageUrl"`
	IsActive   bool     `json:"isActive"`
	TrackStock bool     `json:"trackStock"`
	Barcode    *string  `json:"barcode"`
	UpdatedAt  *string  `json:"updatedAt"`
}

// UpsertProducts replaces the cached products in one transaction while
// keeping local stock deltas (stock decremented by offline sales) so a
// server pull does not resurrect sold stock before the orders sync.
func (s *Store) UpsertProducts(products []Product) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, p := range products {
		_, err := tx.Exec(`INSERT INTO products(id, name, price, stock, category, image_url, is_active, track_stock, barcode, updated_at)
			VALUES(?,?,?,?,?,?,?,?,?,?)
			ON CONFLICT(id) DO UPDATE SET
				name=excluded.name, price=excluded.price, category=excluded.category,
				image_url=excluded.image_url, is_active=excluded.is_active,
				track_stock=excluded.track_stock, barcode=excluded.barcode, updated_at=excluded.updated_at`,
			p.ID, p.Name, p.Price, p.Stock, p.Category, p.ImageURL, boolInt(p.IsActive), boolInt(p.TrackStock), p.Barcode, p.UpdatedAt)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// AdjustLocalStock subtracts sold quantities from the cached stock so the
// cashier shows correct availability while offline.
func (s *Store) AdjustLocalStock(productID string, delta int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`UPDATE products SET stock = stock + ? WHERE id = ?`, delta, productID)
	return err
}

func (s *Store) GetProducts(search, category string, includeInactive bool) ([]Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	q := `SELECT id, name, price, stock, category, image_url, is_active, track_stock, barcode, updated_at FROM products WHERE 1=1`
	var args []any
	if !includeInactive {
		q += ` AND is_active = 1`
	}
	if search != "" {
		q += ` AND (name LIKE ? OR IFNULL(barcode,'') = ?)`
		args = append(args, "%"+search+"%", search)
	}
	if category != "" && category != "all" {
		q += ` AND category = ?`
		args = append(args, category)
	}
	q += ` ORDER BY name`
	rows, err := s.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Product
	for rows.Next() {
		var p Product
		var active, track int
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock, &p.Category, &p.ImageURL, &active, &track, &p.Barcode, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.IsActive = active == 1
		p.TrackStock = track == 1
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) CountProducts() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int
	s.db.QueryRow(`SELECT COUNT(*) FROM products`).Scan(&n)
	return n
}

func (s *Store) GetProductByID(id string) (*Product, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var p Product
	var active, track int
	err := s.db.QueryRow(`SELECT id, name, price, stock, category, image_url, is_active, track_stock, barcode, updated_at FROM products WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &p.Price, &p.Stock, &p.Category, &p.ImageURL, &active, &track, &p.Barcode, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.IsActive = active == 1
	p.TrackStock = track == 1
	return &p, nil
}

func (s *Store) GetCategories() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT DISTINCT category FROM products WHERE IFNULL(category,'') != '' ORDER BY category`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var c string
		if rows.Scan(&c) == nil {
			out = append(out, c)
		}
	}
	return out
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
