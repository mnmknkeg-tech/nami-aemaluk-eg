package apps

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5"
)

// Repository handles persistence for the Apps domain.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new apps repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const appColumns = "id, key, name, description, version, permissions, hooks, created_at, updated_at"

// ListApps returns all apps.
func (r *Repository) ListApps(ctx context.Context) ([]App, error) {
	rows, err := r.pool.Query(ctx, "SELECT "+appColumns+" FROM apps ORDER BY created_at DESC")
	if err != nil {
		return nil, errors.Internal("list_apps_failed", err)
	}
	defer rows.Close()
	var apps []App
	for rows.Next() {
		a, err := scanApp(rows)
		if err != nil {
			return nil, err
		}
		if a != nil {
			apps = append(apps, *a)
		}
	}
	return apps, rows.Err()
}

// FindByKey returns an app by key.
func (r *Repository) FindByKey(ctx context.Context, key string) (*App, error) {
	row := r.pool.QueryRow(ctx, "SELECT "+appColumns+" FROM apps WHERE key = $1", strings.ToLower(strings.TrimSpace(key)))
	return scanApp(row)
}

// ListShopApps returns installed apps for a shop.
func (r *Repository) ListShopApps(ctx context.Context, shopID string) ([]ShopApp, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sa.id, sa.shop_id, sa.app_id, sa.status, sa.is_active, sa.settings, sa.installed_at, sa.updated_at,
		       a.key, a.name, a.version
		FROM shop_apps sa
		JOIN apps a ON a.id = sa.app_id
		WHERE sa.shop_id = $1 AND sa.status = 'INSTALLED'
		ORDER BY sa.installed_at DESC
	`, shopID)
	if err != nil {
		return nil, errors.Internal("list_shop_apps_failed", err)
	}
	defer rows.Close()
	var shopApps []ShopApp
	for rows.Next() {
		var sa ShopApp
		var settings sql.NullString
		var appKey, appName, appVersion sql.NullString
		err := rows.Scan(
			&sa.ID, &sa.ShopID, &sa.AppID, &sa.Status, &sa.IsActive, &settings,
			&sa.InstalledAt, &sa.UpdatedAt,
			&appKey, &appName, &appVersion,
		)
		if err != nil {
			return nil, errors.Internal("scan_shop_app_failed", err)
		}
		sa.AppKey = appKey.String
		sa.AppName = appName.String
		sa.AppVersion = appVersion.String
		shopApps = append(shopApps, sa)
	}
	return shopApps, rows.Err()
}

// UpsertShopApp installs or reinstalls an app for a shop.
func (r *Repository) UpsertShopApp(ctx context.Context, shopID, appID string) (*ShopApp, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO shop_apps (id, shop_id, app_id, status, is_active, installed_at, updated_at)
		VALUES (gen_random_uuid()::text, $1, $2, 'INSTALLED', true, NOW(), NOW())
		ON CONFLICT (shop_id, app_id) DO UPDATE
			SET status = 'INSTALLED', is_active = true, installed_at = NOW(), updated_at = NOW()
		RETURNING id, shop_id, app_id, status, is_active, installed_at, updated_at
	`, shopID, appID)
	var sa ShopApp
	err := row.Scan(&sa.ID, &sa.ShopID, &sa.AppID, &sa.Status, &sa.IsActive, &sa.InstalledAt, &sa.UpdatedAt)
	if err != nil {
		return nil, errors.Internal("upsert_shop_app_failed", err)
	}
	return &sa, nil
}

// FindShopApp returns a shop app by shop and app ID.
func (r *Repository) FindShopApp(ctx context.Context, shopID, appID string) (*ShopApp, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, shop_id, app_id, status, is_active, installed_at, updated_at
		FROM shop_apps WHERE shop_id = $1 AND app_id = $2
	`, shopID, appID)
	var sa ShopApp
	err := row.Scan(&sa.ID, &sa.ShopID, &sa.AppID, &sa.Status, &sa.IsActive, &sa.InstalledAt, &sa.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("find_shop_app_failed", err)
	}
	return &sa, nil
}

// UninstallShopApp marks a shop app as uninstalled.
func (r *Repository) UninstallShopApp(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, "UPDATE shop_apps SET status = 'UNINSTALLED', is_active = false, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return errors.Internal("uninstall_shop_app_failed", err)
	}
	return nil
}

// SetActive updates the is_active flag for a shop app.
func (r *Repository) SetActive(ctx context.Context, id string, active bool) (*ShopApp, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE shop_apps SET is_active = $2, updated_at = NOW()
		WHERE id = $1 RETURNING id, shop_id, app_id, status, is_active, installed_at, updated_at
	`, id, active)
	var sa ShopApp
	err := row.Scan(&sa.ID, &sa.ShopID, &sa.AppID, &sa.Status, &sa.IsActive, &sa.InstalledAt, &sa.UpdatedAt)
	if err != nil {
		return nil, errors.Internal("set_active_shop_app_failed", err)
	}
	return &sa, nil
}

func scanApp(row pgx.Row) (*App, error) {
	var a App
	var permissions, hooks []byte
	err := row.Scan(&a.ID, &a.Key, &a.Name, &a.Description, &a.Version, &permissions, &hooks, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, errors.Internal("scan_app_failed", err)
	}
	a.Permissions = permissions
	a.Hooks = hooks
	return &a, nil
}

func parseStringArray(data []byte) []string {
	var arr []string
	if len(data) > 0 {
		json.Unmarshal(data, &arr)
	}
	if arr == nil {
		arr = []string{}
	}
	return arr
}
