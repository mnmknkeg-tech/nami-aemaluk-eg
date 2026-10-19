package accounting

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/jackc/pgx/v5"
)

// Repository handles database operations for the accounting module.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new accounting repository.
func NewRepository(pool *db.Pool) *Repository { return &Repository{pool: pool} }

// ---------------------------------------------------------------------------
// Default chart of accounts template (seeded per shop on first load)
// ---------------------------------------------------------------------------

type seedAccount struct {
	Code, Name, Type string
	Parent           string // parent code
	IsGroup          bool
}

var defaultCOA = []seedAccount{
	{"1000", "الأصول", "asset", "", true},
	{"1100", "الأصول المتداولة", "asset", "1000", true},
	{"1110", "النقدية بالصندوق", "asset", "1100", false},
	{"1120", "النقدية بالبنوك", "asset", "1100", false},
	{"1130", "العملاء والمدينون", "asset", "1100", false},
	{"1140", "المخزون", "asset", "1100", false},
	{"1150", "مصروفات مقدمة", "asset", "1100", false},
	{"1200", "الأصول الثابتة", "asset", "1000", true},
	{"1210", "أثاث ومفروشات", "asset", "1200", false},
	{"1220", "معدات وأجهزة", "asset", "1200", false},
	{"1230", "مباني", "asset", "1200", false},
	{"1240", "مركبات", "asset", "1200", false},
	{"1290", "مجمع الإهلاك", "asset", "1200", false},
	{"2000", "الالتزامات", "liability", "", true},
	{"2100", "الموردون والدائنون", "liability", "2000", false},
	{"2200", "ضرائب مستحقة", "liability", "2000", false},
	{"2300", "رواتب مستحقة", "liability", "2000", false},
	{"2400", "قروض قصيرة الأجل", "liability", "2000", false},
	{"2500", "قروض طويلة الأجل", "liability", "2000", false},
	{"3000", "حقوق الملكية", "equity", "", true},
	{"3100", "رأس المال", "equity", "3000", false},
	{"3200", "الأرباح المحتجزة", "equity", "3000", false},
	{"3300", "المسحوبات الشخصية", "equity", "3000", false},
	{"4000", "الإيرادات", "revenue", "", true},
	{"4100", "إيرادات المبيعات", "revenue", "4000", false},
	{"4200", "إيرادات الخدمات", "revenue", "4000", false},
	{"4300", "إيرادات أخرى", "revenue", "4000", false},
	{"5000", "المصروفات", "expense", "", true},
	{"5100", "تكلفة البضاعة المباعة", "expense", "5000", false},
	{"5200", "الرواتب والأجور", "expense", "5000", false},
	{"5300", "الإيجار", "expense", "5000", false},
	{"5400", "كهرباء ومياه", "expense", "5000", false},
	{"5500", "تسويق وإعلان", "expense", "5000", false},
	{"5600", "نقل وشحن", "expense", "5000", false},
	{"5700", "اتصالات وإنترنت", "expense", "5000", false},
	{"5800", "مصروفات أخرى", "expense", "5000", false},
}

// EnsureDefaultCOA seeds the standard chart of accounts for a shop that has none.
func (r *Repository) EnsureDefaultCOA(ctx context.Context, shopID string) error {
	var count int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM acc_accounts WHERE shop_id = $1`, shopID).Scan(&count); err != nil {
		return fmt.Errorf("count accounts: %w", err)
	}
	if count > 0 {
		return nil
	}
	ids := map[string]string{} // code -> id
	for _, sa := range defaultCOA {
		var parentID *string
		if sa.Parent != "" {
			if pid, ok := ids[sa.Parent]; ok {
				parentID = &pid
			}
		}
		var id string
		err := r.pool.QueryRow(ctx,
			`INSERT INTO acc_accounts (shop_id, code, name, type, parent_id, is_group, is_system)
			 VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id`,
			shopID, sa.Code, sa.Name, sa.Type, parentID, sa.IsGroup).Scan(&id)
		if err != nil {
			return fmt.Errorf("seed account %s: %w", sa.Code, err)
		}
		ids[sa.Code] = id
	}
	return nil
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

const accountCols = `id, shop_id, code, name, type, parent_id, is_group, is_system, opening_balance, status, created_at`

func scanAccount(row pgx.Row) (*Account, error) {
	var a Account
	var createdAt time.Time
	if err := row.Scan(&a.ID, &a.ShopID, &a.Code, &a.Name, &a.Type, &a.ParentID, &a.IsGroup, &a.IsSystem, &a.OpeningBalance, &a.Status, &createdAt); err != nil {
		return nil, err
	}
	a.CreatedAt = createdAt.Format(time.RFC3339)
	return &a, nil
}

func (r *Repository) ListAccounts(ctx context.Context, shopID string) ([]AccountWithBalance, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+accountCols+`,
			COALESCE(b.debit, 0) AS debit_balance,
			COALESCE(b.credit, 0) AS credit_balance
		FROM acc_accounts a
		LEFT JOIN (
			SELECT l.account_id, SUM(l.debit) AS debit, SUM(l.credit) AS credit
			FROM acc_journal_lines l
			JOIN acc_journal_entries e ON e.id = l.entry_id
			WHERE e.status = 'posted' AND e.shop_id = $1
			GROUP BY l.account_id
		) b ON b.account_id = a.id
		WHERE a.shop_id = $1
		ORDER BY a.code ASC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("list accounts: %w", err)
	}
	defer rows.Close()

	out := make([]AccountWithBalance, 0)
	for rows.Next() {
		var a AccountWithBalance
		var createdAt time.Time
		if err := rows.Scan(&a.ID, &a.ShopID, &a.Code, &a.Name, &a.Type, &a.ParentID, &a.IsGroup, &a.IsSystem, &a.OpeningBalance, &a.Status, &createdAt, &a.DebitBalance, &a.CreditBalance); err != nil {
			continue
		}
		a.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repository) GetAccount(ctx context.Context, id, shopID string) (*Account, error) {
	var a Account
	var createdAt time.Time
	query := `SELECT id, shop_id, code, name, type, parent_id, is_group, is_system, opening_balance, status, created_at FROM acc_accounts WHERE id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&a.ID, &a.ShopID, &a.Code, &a.Name, &a.Type, &a.ParentID,
		&a.IsGroup, &a.IsSystem, &a.OpeningBalance, &a.Status, &createdAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get account: %w", err)
	}
	a.CreatedAt = createdAt.Format(time.RFC3339)
	return &a, nil
}

func (r *Repository) CreateAccount(ctx context.Context, shopID string, dto *CreateAccountDTO) (*Account, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO acc_accounts (shop_id, code, name, type, parent_id, is_group, opening_balance)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING `+accountCols,
		shopID, dto.Code, dto.Name, dto.Type, dto.ParentID, dto.IsGroup, dto.OpeningBalance)
	a, err := scanAccount(row)
	if err != nil {
		return nil, fmt.Errorf("create account: %w", err)
	}
	return a, nil
}

func (r *Repository) UpdateAccount(ctx context.Context, id, shopID string, dto *UpdateAccountDTO) (*Account, error) {
	query := `UPDATE acc_accounts SET
			name = COALESCE($2, name),
			parent_id = COALESCE($3, parent_id),
			status = COALESCE($4, status),
			updated_at = NOW()
		 WHERE id = $1`
	args := []any{id, dto.Name, dto.ParentID, dto.Status}
	if shopID != "" {
		query += " AND shop_id = $5"
		args = append(args, shopID)
	}
	query += " RETURNING " + accountCols
	row := r.pool.QueryRow(ctx, query, args...)
	a, err := scanAccount(row)
	if err != nil {
		return nil, fmt.Errorf("update account: %w", err)
	}
	return a, nil
}

func (r *Repository) DeleteAccount(ctx context.Context, id, shopID string) error {
	query := `DELETE FROM acc_accounts WHERE id = $1 AND is_system = FALSE AND is_group = FALSE`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	ct, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("delete account: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("حساب نظامي أو مجموعة لا يمكن حذفها")
	}
	return nil
}

// AccountHasJournalLines reports whether an account is used by journal lines.
func (r *Repository) AccountHasJournalLines(ctx context.Context, id, shopID string) (bool, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM acc_journal_lines WHERE account_id = $1`, id).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// ---------------------------------------------------------------------------
// Journal entries (double-entry)
// ---------------------------------------------------------------------------

func (r *Repository) nextEntryNumber(ctx context.Context, tx pgx.Tx, shopID string) (string, error) {
	var n int
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(MAX(SUBSTRING(number FROM 4)::INT), 0) + 1
		 FROM acc_journal_entries WHERE shop_id = $1 AND number LIKE 'JE-%'`, shopID).Scan(&n); err != nil {
		return "", err
	}
	return fmt.Sprintf("JE-%06d", n), nil
}

// CreateJournalEntry inserts a draft entry with its lines atomically.
func (r *Repository) CreateJournalEntry(ctx context.Context, shopID, createdBy string, dto *CreateJournalEntryDTO) (*JournalEntry, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	number, err := r.nextEntryNumber(ctx, tx, shopID)
	if err != nil {
		return nil, fmt.Errorf("next number: %w", err)
	}

	var e JournalEntry
	var postedAt *time.Time
	var createdAt time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO acc_journal_entries (shop_id, number, entry_date, description, reference, status, created_by)
		 VALUES ($1,$2,$3,$4,$5,'draft',$6)
		 RETURNING id, shop_id, number, entry_date, description, reference, status, total_debit, total_credit, posted_at, posted_by, reversed_by_entry_id, created_by, created_at`,
		shopID, number, dto.EntryDate, dto.Description, dto.Reference, createdBy).
		Scan(&e.ID, &e.ShopID, &e.Number, &e.EntryDate, &e.Description, &e.Reference, &e.Status, &e.TotalDebit, &e.TotalCredit, &postedAt, &e.PostedBy, &e.ReversedByEntryID, &e.CreatedBy, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("insert entry: %w", err)
	}
	e.CreatedAt = createdAt.Format(time.RFC3339)

	// resolve account codes to IDs if AccountID is empty
	accountMap := map[string]string{} // code -> id
	for i, l := range dto.Lines {
		acctID := l.AccountID
		if acctID == "" && l.AccountCode != "" {
			if acctID == "" {
				var id string
				if err := tx.QueryRow(ctx, `SELECT id FROM acc_accounts WHERE shop_id = $1 AND code = $2`, shopID, l.AccountCode).Scan(&id); err != nil {
					return nil, fmt.Errorf("resolve account code %s: %w", l.AccountCode, err)
				}
				acctID = id
			}
		}
		accountMap[l.AccountCode] = acctID
		if _, err := tx.Exec(ctx,
			`INSERT INTO acc_journal_lines (entry_id, account_id, description, debit, credit, line_no)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
			e.ID, acctID, l.Description, l.Debit, l.Credit, i+1); err != nil {
			return nil, fmt.Errorf("insert line %d: %w", i+1, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return r.GetJournalEntry(ctx, e.ID, "")
}

// UpdateJournalEntry replaces editable fields of a draft entry.
func (r *Repository) UpdateJournalEntry(ctx context.Context, id, shopID string, dto *UpdateJournalEntryDTO) (*JournalEntry, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	update := `UPDATE acc_journal_entries SET
			entry_date = COALESCE(NULLIF($2,''), entry_date),
			description = COALESCE(NULLIF($3,''), description),
			reference = COALESCE($4, reference),
			updated_at = NOW()
		 WHERE id = $1 AND status = 'draft'`
	args := []any{id, dto.EntryDate, dto.Description, dto.Reference}
	if shopID != "" {
		update += " AND shop_id = $5"
		args = append(args, shopID)
	}
	ct, err := tx.Exec(ctx, update, args...)
	if err != nil {
		return nil, err
	}
	if ct.RowsAffected() == 0 {
		return nil, fmt.Errorf("القيد غير موجود أو مرحَّل ولا يمكن تعديله")
	}
	if len(dto.Lines) > 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM acc_journal_lines WHERE entry_id = $1`, id); err != nil {
			return nil, err
		}
		for i, l := range dto.Lines {
			if _, err := tx.Exec(ctx,
				`INSERT INTO acc_journal_lines (entry_id, account_id, description, debit, credit, line_no)
				 VALUES ($1,$2,$3,$4,$5,$6)`, id, l.AccountID, l.Description, l.Debit, l.Credit, i+1); err != nil {
				return nil, err
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetJournalEntry(ctx, id, shopID)
}

// PostJournalEntry validates balance and posts the entry.
func (r *Repository) PostJournalEntry(ctx context.Context, id, shopID, postedBy string) (*JournalEntry, error) {
	var d, c float64
	if err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) FROM acc_journal_lines WHERE entry_id = $1`, id).
		Scan(&d, &c); err != nil {
		return nil, err
	}
	if d == 0 || c == 0 {
		return nil, fmt.Errorf("لا يمكن ترحيل قيد بدون أطراف مدين ودائن")
	}
	if d != c {
		return nil, fmt.Errorf("القيد غير متوازن: مدين %.2f ≠ دائن %.2f", d, c)
	}
	query := `UPDATE acc_journal_entries SET status='posted', posted_at=NOW(), posted_by=$2, total_debit=$3, total_credit=$4, updated_at=NOW()
		 WHERE id=$1 AND status='draft'`
	args := []any{id, postedBy, d, c}
	if shopID != "" {
		query += " AND shop_id = $5"
		args = append(args, shopID)
	}
	if _, err := r.pool.Exec(ctx, query, args...); err != nil {
		return nil, err
	}
	return r.GetJournalEntry(ctx, id, shopID)
}

// ReverseJournalEntry posts an opposite entry and marks the original reversed.
func (r *Repository) ReverseJournalEntry(ctx context.Context, id, shopID, postedBy string) (*JournalEntry, error) {
	orig, err := r.GetJournalEntry(ctx, id, shopID)
	if err != nil {
		return nil, err
	}
	if orig.Status != "posted" {
		return nil, fmt.Errorf("يمكن عكس القيود المرحَّلة فقط")
	}
	if orig.ReversedByEntryID != "" {
		return nil, fmt.Errorf("القيد معكوس بالفعل")
	}

	dto := CreateJournalEntryDTO{
		EntryDate:   time.Now().Format("2006-01-02"),
		Description: "قيد عكسي للقيد " + orig.Number + ": " + orig.Description,
		Reference:   orig.Number,
		Lines:       make([]JournalLineInput, 0, len(orig.Lines)),
	}
	for _, l := range orig.Lines {
		dto.Lines = append(dto.Lines, JournalLineInput{
			AccountID:   l.AccountID,
			Description: l.Description,
			Debit:       l.Credit,
			Credit:      l.Debit,
		})
	}

	rev, err := r.CreateJournalEntry(ctx, orig.ShopID, postedBy, &dto)
	if err != nil {
		return nil, err
	}
	if _, err := r.PostJournalEntry(ctx, rev.ID, shopID, postedBy); err != nil {
		return nil, err
	}
	if _, err := r.pool.Exec(ctx,
		`UPDATE acc_journal_entries SET status='reversed', reversed_by_entry_id=$2, updated_at=NOW() WHERE id=$1`,
		id, rev.ID); err != nil {
		return nil, err
	}
	return r.GetJournalEntry(ctx, rev.ID, shopID)
}

func (r *Repository) DeleteJournalEntry(ctx context.Context, id, shopID string) error {
	query := `DELETE FROM acc_journal_entries WHERE id=$1 AND status='draft'`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	ct, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("القيد غير موجود أو مرحَّل ولا يمكن حذفه")
	}
	return nil
}

const entryCols = `e.id, e.shop_id, e.number, e.entry_date, e.description, e.reference, e.status, e.total_debit, e.total_credit, e.posted_at, e.posted_by, COALESCE(e.reversed_by_entry_id::TEXT,''), COALESCE(e.created_by,''), e.created_at`

func (r *Repository) GetJournalEntry(ctx context.Context, id, shopID string) (*JournalEntry, error) {
	query := `SELECT ` + entryCols + ` FROM acc_journal_entries e WHERE e.id=$1`
	args := []any{id}
	if shopID != "" {
		query += " AND e.shop_id = $2"
		args = append(args, shopID)
	}
	var e JournalEntry
	var entryDate time.Time
	var postedAt *time.Time
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&e.ID, &e.ShopID, &e.Number, &entryDate, &e.Description, &e.Reference, &e.Status, &e.TotalDebit, &e.TotalCredit, &postedAt, &e.PostedBy, &e.ReversedByEntryID, &e.CreatedBy, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("get entry: %w", err)
	}
	e.EntryDate = entryDate.Format("2006-01-02")
	if postedAt != nil {
		e.PostedAt = postedAt.Format(time.RFC3339)
	}
	e.CreatedAt = createdAt.Format(time.RFC3339)
	lines, err := r.entryLines(ctx, e.ID)
	if err != nil {
		return nil, err
	}
	e.Lines = lines
	return &e, nil
}

func (r *Repository) entryLines(ctx context.Context, entryID string) ([]JournalLine, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT l.id, l.entry_id, l.account_id, COALESCE(a.code,''), COALESCE(a.name,''),
		       COALESCE(l.description,''), l.debit, l.credit, l.line_no
		FROM acc_journal_lines l
		LEFT JOIN acc_accounts a ON a.id = l.account_id
		WHERE l.entry_id = $1 ORDER BY l.line_no ASC`, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]JournalLine, 0)
	for rows.Next() {
		var l JournalLine
		if err := rows.Scan(&l.ID, &l.EntryID, &l.AccountID, &l.AccountCode, &l.AccountName, &l.Description, &l.Debit, &l.Credit, &l.LineNo); err != nil {
			continue
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *Repository) ListJournalEntries(ctx context.Context, shopID, status, from, to string) ([]JournalEntry, error) {
	where := "e.shop_id = $1"
	args := []any{shopID}
	if status != "" {
		args = append(args, status)
		where += fmt.Sprintf(" AND e.status = $%d", len(args))
	}
	if from != "" {
		args = append(args, from)
		where += fmt.Sprintf(" AND e.entry_date >= $%d", len(args))
	}
	if to != "" {
		args = append(args, to)
		where += fmt.Sprintf(" AND e.entry_date <= $%d", len(args))
	}
	rows, err := r.pool.Query(ctx,
		`SELECT `+entryCols+` FROM acc_journal_entries e WHERE `+where+` ORDER BY e.entry_date DESC, e.number DESC LIMIT 500`, args...)
	if err != nil {
		return nil, fmt.Errorf("list entries: %w", err)
	}
	defer rows.Close()

	out := make([]JournalEntry, 0)
	for rows.Next() {
		var e JournalEntry
		var entryDate time.Time
		var postedAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&e.ID, &e.ShopID, &e.Number, &entryDate, &e.Description, &e.Reference, &e.Status, &e.TotalDebit, &e.TotalCredit, &postedAt, &e.PostedBy, &e.ReversedByEntryID, &e.CreatedBy, &createdAt); err != nil {
			continue
		}
		e.EntryDate = entryDate.Format("2006-01-02")
		if postedAt != nil {
			e.PostedAt = postedAt.Format(time.RFC3339)
		}
		e.CreatedAt = createdAt.Format(time.RFC3339)
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range out {
		if lines, err := r.entryLines(ctx, out[i].ID); err == nil {
			out[i].Lines = lines
		}
	}
	return out, nil
}

func (r *Repository) TrialBalance(ctx context.Context, shopID, from, to string) (*TrialBalance, error) {
	dateFilter := "e.status = 'posted' AND e.shop_id = $1"
	args := []any{shopID}
	if from != "" {
		args = append(args, from)
		dateFilter += fmt.Sprintf(" AND e.entry_date >= $%d", len(args))
	}
	if to != "" {
		args = append(args, to)
		dateFilter += fmt.Sprintf(" AND e.entry_date <= $%d", len(args))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT a.id, a.code, a.name, a.type, COALESCE(SUM(l.debit),0), COALESCE(SUM(l.credit),0)
		FROM acc_accounts a
		LEFT JOIN acc_journal_lines l ON l.account_id = a.id
		LEFT JOIN acc_journal_entries e ON e.id = l.entry_id AND `+dateFilter+`
		WHERE a.shop_id = $1 AND a.is_group = FALSE
		GROUP BY a.id, a.code, a.name, a.type
		HAVING COALESCE(SUM(l.debit),0) <> 0 OR COALESCE(SUM(l.credit),0) <> 0
		ORDER BY a.code ASC`, args...)
	if err != nil {
		return nil, fmt.Errorf("trial balance: %w", err)
	}
	defer rows.Close()

	tb := &TrialBalance{ShopID: shopID, FromDate: from, ToDate: to, Rows: make([]TrialBalanceRow, 0)}
	for rows.Next() {
		var row TrialBalanceRow
		if err := rows.Scan(&row.AccountID, &row.Code, &row.Name, &row.Type, &row.DebitTotal, &row.CreditTotal); err != nil {
			continue
		}
		switch row.Type {
		case "asset", "expense":
			row.DebitBalance = row.DebitTotal - row.CreditTotal
		default:
			row.CreditBalance = row.CreditTotal - row.DebitTotal
		}
		tb.TotalDebit += row.DebitBalance
		tb.TotalCredit += row.CreditBalance
		tb.Rows = append(tb.Rows, row)
	}
	tb.IsBalanced = absEq(tb.TotalDebit, tb.TotalCredit)
	return tb, rows.Err()
}

// AccountTotals aggregates posted debit/credit per leaf account in a period.
func (r *Repository) AccountTotals(ctx context.Context, shopID, from, to string) (map[string][2]float64, error) {
	dateFilter := "e.status = 'posted' AND e.shop_id = $1"
	args := []any{shopID}
	if from != "" {
		args = append(args, from)
		dateFilter += fmt.Sprintf(" AND e.entry_date >= $%d", len(args))
	}
	if to != "" {
		args = append(args, to)
		dateFilter += fmt.Sprintf(" AND e.entry_date <= $%d", len(args))
	}
	rows, err := r.pool.Query(ctx, `
		SELECT l.account_id, COALESCE(SUM(l.debit),0), COALESCE(SUM(l.credit),0)
		FROM acc_journal_lines l
		JOIN acc_journal_entries e ON e.id = l.entry_id
		WHERE `+dateFilter+`
		GROUP BY l.account_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][2]float64{}
	for rows.Next() {
		var id string
		var d, c float64
		if err := rows.Scan(&id, &d, &c); err != nil {
			continue
		}
		out[id] = [2]float64{d, c}
	}
	return out, rows.Err()
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// --- Entities ---

func (r *Repository) ListEntities(ctx context.Context, shopID, entityType string) ([]Entity, error) {
	query := `SELECT id, shop_id, entity_type, name, name_en, tax_id, phone, email, address, currency_code, credit_limit, balance, status, created_at, updated_at
		FROM acc_entities WHERE shop_id = $1`
	args := []any{shopID}
	if entityType != "" {
		args = append(args, entityType)
		query += fmt.Sprintf(" AND entity_type = $%d", len(args))
	}
	query += " ORDER BY name"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list entities: %w", err)
	}
	defer rows.Close()
	var out []Entity
	for rows.Next() {
		var e Entity
		var nameEn, taxID, phone, email, address sql.NullString
		if err := rows.Scan(&e.ID, &e.ShopID, &e.EntityType, &e.Name, &nameEn, &taxID, &phone, &email, &address, &e.CurrencyCode, &e.CreditLimit, &e.Balance, &e.Status, &e.CreatedAt, &e.UpdatedAt); err != nil {
			continue
		}
		e.NameEN = nameEn.String
		e.TaxID = taxID.String
		e.Phone = phone.String
		e.Email = email.String
		e.Address = address.String
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *Repository) GetEntity(ctx context.Context, id, shopID string) (*Entity, error) {
	query := `
		SELECT id, shop_id, entity_type, name, name_en, tax_id, phone, email, address, currency_code, credit_limit, balance, status, created_at, updated_at
		FROM acc_entities WHERE id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	var e Entity
	var nameEn, taxID, phone, email, address sql.NullString
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&e.ID, &e.ShopID, &e.EntityType, &e.Name, &nameEn, &taxID, &phone, &email, &address, &e.CurrencyCode, &e.CreditLimit, &e.Balance, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	e.NameEN = nameEn.String
	e.TaxID = taxID.String
	e.Phone = phone.String
	e.Email = email.String
	e.Address = address.String
	return &e, nil
}

func (r *Repository) CreateEntity(ctx context.Context, shopID, userID string, dto *CreateEntityDTO) (*Entity, error) {
	var e Entity
	var nameEn, taxID, phone, email, address sql.NullString
	err := r.pool.QueryRow(ctx, `
		INSERT INTO acc_entities (shop_id, entity_type, name, name_en, tax_id, phone, email, address, currency_code, credit_limit, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, shop_id, entity_type, name, name_en, tax_id, phone, email, address, currency_code, credit_limit, balance, status, created_at, updated_at`,
		shopID, dto.EntityType, dto.Name,
		nullString(dto.NameEN), nullString(dto.TaxID), nullString(dto.Phone),
		nullString(dto.Email), nullString(dto.Address),
		nullString(dto.CurrencyCode), dto.CreditLimit, userID,
	).Scan(&e.ID, &e.ShopID, &e.EntityType, &e.Name, &nameEn, &taxID, &phone, &email, &address, &e.CurrencyCode, &e.CreditLimit, &e.Balance, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create entity: %w", err)
	}
	e.NameEN = nameEn.String
	e.TaxID = taxID.String
	e.Phone = phone.String
	e.Email = email.String
	e.Address = address.String
	return &e, nil
}

func (r *Repository) GetEntityBalance(ctx context.Context, entityID, shopID string) (float64, error) {
	var bal float64
	query := `SELECT balance FROM acc_entities WHERE id = $1`
	args := []any{entityID}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	err := r.pool.QueryRow(ctx, query, args...).Scan(&bal)
	return bal, err
}

func (r *Repository) UpdateEntityBalance(ctx context.Context, entityID, shopID string, amount float64) error {
	query := `UPDATE acc_entities SET balance = balance + $1 WHERE id = $2`
	args := []any{amount, entityID}
	if shopID != "" {
		query += " AND shop_id = $3"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

func (r *Repository) DeleteEntity(ctx context.Context, id, shopID string) error {
	query := `DELETE FROM acc_entities WHERE id = $1
		AND (SELECT COUNT(*) FROM acc_invoices WHERE entity_id = $1) = 0
		AND (SELECT COUNT(*) FROM acc_payments WHERE entity_id = $1) = 0`
	args := []any{id}
	if shopID != "" {
		query += " AND shop_id = $2"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

func (r *Repository) UpdateEntity(ctx context.Context, id, shopID string, dto *UpdateEntityDTO) (*Entity, error) {
	set, args := []string{"updated_at = NOW()"}, []any{}
	ai := 1
	if dto.Name != nil {
		set = append(set, fmt.Sprintf("name = $%d", ai))
		args = append(args, *dto.Name)
		ai++
	}
	if dto.NameEN != nil {
		set = append(set, fmt.Sprintf("name_en = $%d", ai))
		args = append(args, *dto.NameEN)
		ai++
	}
	if dto.TaxID != nil {
		set = append(set, fmt.Sprintf("tax_id = $%d", ai))
		args = append(args, *dto.TaxID)
		ai++
	}
	if dto.Phone != nil {
		set = append(set, fmt.Sprintf("phone = $%d", ai))
		args = append(args, *dto.Phone)
		ai++
	}
	if dto.Email != nil {
		set = append(set, fmt.Sprintf("email = $%d", ai))
		args = append(args, *dto.Email)
		ai++
	}
	if dto.Address != nil {
		set = append(set, fmt.Sprintf("address = $%d", ai))
		args = append(args, *dto.Address)
		ai++
	}
	if dto.CreditLimit != nil {
		set = append(set, fmt.Sprintf("credit_limit = $%d", ai))
		args = append(args, *dto.CreditLimit)
		ai++
	}
	if dto.Status != nil {
		set = append(set, fmt.Sprintf("status = $%d", ai))
		args = append(args, *dto.Status)
		ai++
	}
	args = append(args, id)
	where := fmt.Sprintf("WHERE id = $%d", ai)
	if shopID != "" {
		ai++
		where += fmt.Sprintf(" AND shop_id = $%d", ai)
		args = append(args, shopID)
	}
	query := fmt.Sprintf(`UPDATE acc_entities SET %s %s RETURNING id, shop_id, entity_type, name, name_en, tax_id, phone, email, address, currency_code, credit_limit, balance, status, created_at, updated_at`, strings.Join(set, ", "), where)
	var e Entity
	var nameEn, taxID, phone, email, address sql.NullString
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&e.ID, &e.ShopID, &e.EntityType, &e.Name, &nameEn, &taxID, &phone, &email, &address, &e.CurrencyCode, &e.CreditLimit, &e.Balance, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	e.NameEN = nameEn.String
	e.TaxID = taxID.String
	e.Phone = phone.String
	e.Email = email.String
	e.Address = address.String
	return &e, nil
}

// --- Invoices ---

func (r *Repository) CreateInvoice(ctx context.Context, shopID, userID string, dto *CreateInvoiceDTO) (*Invoice, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var subtotal, taxTotal float64
	for _, l := range dto.Lines {
		amt := l.Quantity * l.UnitPrice
		lineTax := amt * l.TaxRate / 100
		taxTotal += lineTax
		subtotal += amt
	}
	total := round2(subtotal + taxTotal)
	var invID string
	err = tx.QueryRow(ctx, `
		INSERT INTO acc_invoices (shop_id, entity_id, invoice_type, number, invoice_date, due_date, currency_code, subtotal, tax_total, total, balance, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11) RETURNING id`,
		shopID, dto.EntityID, dto.InvoiceType, dto.Number, dto.InvoiceDate, dto.DueDate, nullString(dto.CurrencyCode), subtotal, taxTotal, total, userID).Scan(&invID)
	if err != nil {
		return nil, fmt.Errorf("insert invoice: %w", err)
	}
	for i, l := range dto.Lines {
		amt := l.Quantity * l.UnitPrice
		lineTax := amt * l.TaxRate / 100
		_, err = tx.Exec(ctx, `
			INSERT INTO acc_invoice_lines (invoice_id, description, account_id, quantity, unit_price, tax_rate, tax_amount, amount, line_no)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, invID, l.Description, l.AccountID, l.Quantity, l.UnitPrice, l.TaxRate, lineTax, amt, i+1)
		if err != nil {
			return nil, err
		}
	}
	return r.GetInvoice(ctx, invID, "")
}

func (r *Repository) GetInvoice(ctx context.Context, id, shopID string) (*Invoice, error) {
	query := `
		SELECT i.id, i.shop_id, i.entity_id, e.name, i.entity_type, i.invoice_type, i.number, i.invoice_date, i.due_date, i.currency_code, i.subtotal, i.tax_total, i.total, i.paid_amount, i.balance, i.status, i.journal_id, i.created_by, i.created_at, i.updated_at
		FROM acc_invoices i LEFT JOIN acc_entities e ON e.id = i.entity_id
		WHERE i.id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND i.shop_id = $2"
		args = append(args, shopID)
	}
	var inv Invoice
	var entityName, journalID, createdBy sql.NullString
	var invoiceDate, dueDate, createdAt, updatedAt string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&inv.ID, &inv.ShopID, &inv.EntityID, &entityName, &inv.EntityType, &inv.InvoiceType, &inv.Number, &invoiceDate, &dueDate, &inv.CurrencyCode, &inv.Subtotal, &inv.TaxTotal, &inv.Total, &inv.PaidAmount, &inv.Balance, &inv.Status, &journalID, &createdBy, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	inv.InvoiceDate = invoiceDate
	inv.DueDate = dueDate
	inv.CreatedAt = createdAt
	inv.UpdatedAt = updatedAt
	inv.EntityName = entityName.String
	inv.JournalID = journalID.String
	inv.CreatedBy = createdBy.String
	rows, err := r.pool.Query(ctx, `
		SELECT id, invoice_id, description, account_id, quantity, unit_price, tax_rate, tax_amount, amount, line_no
		FROM acc_invoice_lines WHERE invoice_id = $1 ORDER BY line_no`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var l InvoiceLine
		var accountID sql.NullString
		if err := rows.Scan(&l.ID, &l.InvoiceID, &l.Description, &accountID, &l.Quantity, &l.UnitPrice, &l.TaxRate, &l.TaxAmount, &l.Amount, &l.LineNo); err != nil {
			continue
		}
		l.AccountID = accountID.String
		inv.Lines = append(inv.Lines, l)
	}
	return &inv, rows.Err()
}

func (r *Repository) ListInvoices(ctx context.Context, shopID, entityID, status string) ([]Invoice, error) {
	query := `SELECT i.id, i.shop_id, i.entity_id, e.name, i.entity_type, i.invoice_type, i.number, i.invoice_date, i.due_date, i.currency_code, i.subtotal, i.tax_total, i.total, i.paid_amount, i.balance, i.status, i.journal_id, i.created_by, i.created_at, i.updated_at
		FROM acc_invoices i LEFT JOIN acc_entities e ON e.id = i.entity_id
		WHERE i.shop_id = $1`
	args := []any{shopID}
	i := 1
	if entityID != "" {
		i++
		query += fmt.Sprintf(" AND i.entity_id = $%d", i)
		args = append(args, entityID)
	}
	if status != "" {
		i++
		query += fmt.Sprintf(" AND i.status = $%d", i)
		args = append(args, status)
	}
	query += " ORDER BY i.invoice_date DESC, i.number DESC"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}
	defer rows.Close()
	var out []Invoice
	for rows.Next() {
		var inv Invoice
		var entityName, journalID, createdBy sql.NullString
		var invoiceDate, dueDate, createdAt, updatedAt string
		if err := rows.Scan(&inv.ID, &inv.ShopID, &inv.EntityID, &entityName, &inv.EntityType, &inv.InvoiceType, &inv.Number, &invoiceDate, &dueDate, &inv.CurrencyCode, &inv.Subtotal, &inv.TaxTotal, &inv.Total, &inv.PaidAmount, &inv.Balance, &inv.Status, &journalID, &createdBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		inv.InvoiceDate = invoiceDate
		inv.DueDate = dueDate
		inv.CreatedAt = createdAt
		inv.UpdatedAt = updatedAt
		inv.EntityName = entityName.String
		inv.JournalID = journalID.String
		inv.CreatedBy = createdBy.String
		out = append(out, inv)
	}
	return out, rows.Err()
}

func (r *Repository) UpdateInvoiceStatus(ctx context.Context, id, journalID, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE acc_invoices SET status = $1, journal_id = $2 WHERE id = $3`, status, nullString(journalID), id)
	return err
}

func (r *Repository) UpdateInvoiceTotals(ctx context.Context, id string, total, balance float64) error {
	_, err := r.pool.Exec(ctx, `UPDATE acc_invoices SET total = $1, balance = $2 WHERE id = $3`, total, balance, id)
	return err
}

func (r *Repository) GetInvoiceBalanceForUpdate(ctx context.Context, id string) (float64, error) {
	var bal float64
	err := r.pool.QueryRow(ctx, `SELECT balance FROM acc_invoices WHERE id = $1 FOR UPDATE`, id).Scan(&bal)
	return bal, err
}

func (r *Repository) GetInvoiceEntityID(ctx context.Context, invoiceID string) (string, error) {
	var entityID string
	err := r.pool.QueryRow(ctx, `SELECT entity_id FROM acc_invoices WHERE id = $1`, invoiceID).Scan(&entityID)
	return entityID, err
}

func (r *Repository) UpdateInvoice(ctx context.Context, id, shopID, number, dueDate string) error {
	query := `UPDATE acc_invoices SET number = $1, due_date = $2, updated_at = NOW() WHERE id = $3`
	args := []any{number, dueDate, id}
	if shopID != "" {
		query += " AND shop_id = $4"
		args = append(args, shopID)
	}
	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

// --- Payments ---

func (r *Repository) CreatePayment(ctx context.Context, shopID, userID string, dto *CreatePaymentDTO) (*Payment, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var pID string
	err = tx.QueryRow(ctx, `
		INSERT INTO acc_payments (shop_id, entity_id, payment_type, number, payment_date, amount, currency_code, method, reference, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		shopID, dto.EntityID, dto.PaymentType, dto.Number, dto.PaymentDate, dto.Amount, nullString(dto.CurrencyCode), dto.Method, nullString(dto.Reference), userID).Scan(&pID)
	if err != nil {
		return nil, fmt.Errorf("insert payment: %w", err)
	}
	var et string
	_ = tx.QueryRow(ctx, `SELECT entity_type FROM acc_entities WHERE id = $1`, dto.EntityID).Scan(&et)
	_, _ = tx.Exec(ctx, `UPDATE acc_payments SET entity_type = $1 WHERE id = $2`, et, pID)
	for _, a := range dto.Allocations {
		_, err = tx.Exec(ctx, `INSERT INTO acc_payment_allocations (payment_id, invoice_id, allocated) VALUES ($1,$2,$3)`, pID, a.InvoiceID, a.Amount)
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetPayment(ctx, pID, "")
}

func (r *Repository) GetPayment(ctx context.Context, id, shopID string) (*Payment, error) {
	query := `
		SELECT p.id, p.shop_id, p.entity_id, e.name, p.entity_type, p.payment_type, p.number, p.payment_date::text, p.amount, p.currency_code, p.method, p.reference, p.status, p.journal_id, p.created_by, p.created_at::text, p.updated_at::text
		FROM acc_payments p LEFT JOIN acc_entities e ON e.id = p.entity_id
		WHERE p.id = $1`
	args := []any{id}
	if shopID != "" {
		query += " AND p.shop_id = $2"
		args = append(args, shopID)
	}
	var p Payment
	var entityName, reference, journalID, createdBy sql.NullString
	var paymentDate, createdAt, updatedAt string
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&p.ID, &p.ShopID, &p.EntityID, &entityName, &p.EntityType, &p.PaymentType, &p.Number, &paymentDate, &p.Amount, &p.CurrencyCode, &p.Method, &reference, &p.Status, &journalID, &createdBy, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	p.EntityName = entityName.String
	p.Reference = reference.String
	p.JournalID = journalID.String
	p.CreatedBy = createdBy.String
	p.PaymentDate = paymentDate
	p.CreatedAt = createdAt
	p.UpdatedAt = updatedAt
	return &p, nil
}

func (r *Repository) UpdatePaymentStatus(ctx context.Context, id, journalID, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE acc_payments SET status = $1, journal_id = $2 WHERE id = $3`, status, nullString(journalID), id)
	return err
}

func (r *Repository) ListPayments(ctx context.Context, shopID, entityID string) ([]Payment, error) {
	query := `SELECT p.id, p.shop_id, p.entity_id, e.name, p.entity_type, p.payment_type, p.number, p.payment_date::text, p.amount, p.currency_code, p.method, p.reference, p.status, p.journal_id, p.created_by, p.created_at::text, p.updated_at::text
		FROM acc_payments p LEFT JOIN acc_entities e ON e.id = p.entity_id
		WHERE p.shop_id = $1`
	args := []any{shopID}
	if entityID != "" {
		query += " AND p.entity_id = $2"
		args = append(args, entityID)
	}
	query += " ORDER BY p.payment_date DESC"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list payments: %w", err)
	}
	defer rows.Close()
	var out []Payment
	for rows.Next() {
		var p Payment
		var entityName, journalID, createdBy, ref sql.NullString
		var paymentDate, createdAt, updatedAt string
		if err := rows.Scan(&p.ID, &p.ShopID, &p.EntityID, &entityName, &p.EntityType, &p.PaymentType, &p.Number, &paymentDate, &p.Amount, &p.CurrencyCode, &p.Method, &ref, &p.Status, &journalID, &p.CreatedBy, &createdAt, &updatedAt); err != nil {
			continue
		}
		p.PaymentDate = paymentDate
		p.CreatedAt = createdAt
		p.UpdatedAt = updatedAt
		p.EntityName = entityName.String
		if journalID.Valid {
			p.JournalID = journalID.String
		}
		if createdBy.Valid {
			p.CreatedBy = createdBy.String
		}
		p.Reference = ref.String
		out = append(out, p)
	}
	return out, rows.Err()
}

// --- Aging ---

func (r *Repository) CalculateAging(ctx context.Context, shopID, entityType, asOf string) ([]AgingRow, error) {
	if asOf == "" {
		asOf = time.Now().Format("2006-01-02")
	}
	query := `
		SELECT e.id, e.name, e.currency_code,
			COALESCE(SUM(CASE WHEN i.due_date >= $2::date THEN i.balance ELSE 0 END), 0) AS current_amt,
			COALESCE(SUM(CASE WHEN i.due_date < $2::date AND i.due_date >= ($2::date - INTERVAL '30 days') THEN i.balance ELSE 0 END), 0) AS d30_amt,
			COALESCE(SUM(CASE WHEN i.due_date < ($2::date - INTERVAL '30 days') AND i.due_date >= ($2::date - INTERVAL '60 days') THEN i.balance ELSE 0 END), 0) AS d60_amt,
			COALESCE(SUM(CASE WHEN i.due_date < ($2::date - INTERVAL '60 days') AND i.due_date >= ($2::date - INTERVAL '90 days') THEN i.balance ELSE 0 END), 0) AS d90_amt,
			COALESCE(SUM(CASE WHEN i.due_date < ($2::date - INTERVAL '90 days') THEN i.balance ELSE 0 END), 0) AS d90_plus_amt
		FROM acc_entities e
		LEFT JOIN acc_invoices i ON i.entity_id = e.id AND i.balance > 0 AND i.status = 'posted'
		WHERE e.shop_id = $1`
	args := []any{shopID, asOf}
	if entityType != "" {
		query += fmt.Sprintf(" AND e.entity_type = $%d", len(args)+1)
		args = append(args, entityType)
	}
	query += " GROUP BY e.id, e.name, e.currency_code ORDER BY e.name"
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("aging: %w", err)
	}
	defer rows.Close()
	var out []AgingRow
	for rows.Next() {
		var row AgingRow
		if err := rows.Scan(&row.EntityID, &row.EntityName, &row.CurrencyCode, &row.Current, &row.D30, &row.D60, &row.D90, &row.D90Plus); err != nil {
			continue
		}
		row.Total = row.Current + row.D30 + row.D60 + row.D90 + row.D90Plus
		out = append(out, row)
	}
	return out, rows.Err()
}

func absEq(a, b float64) bool {
	const eps = 0.005
	d := a - b
	if d < 0 {
		d = -d
	}
	return d < eps
}
