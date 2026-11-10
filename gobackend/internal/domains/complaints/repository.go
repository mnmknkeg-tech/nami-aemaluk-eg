package complaints

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/google/uuid"
)

// Repository handles database operations for complaints.
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new complaints repository.
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

const complaintColumns = `
	id, shop_id, subject, subject_ar, description,
	COALESCE(customer_name, ''), COALESCE(customer_email, ''), COALESCE(customer_phone, ''),
	status, priority, COALESCE(category, ''), COALESCE(assigned_to, ''), COALESCE(department, ''),
	reported_date::text, resolved_date::text, COALESCE(resolution, ''),
	follow_up_required, follow_up_date::text,
	COALESCE(attachments::text, '[]'), COALESCE(tags::text, '[]'),
	created_at::text, updated_at::text
`

// scanComplaint maps a row onto Complaint, decoding the JSONB arrays and
// normalising timestamps to RFC3339 strings the frontend expects.
func scanComplaint(scan func(dest ...interface{}) error) (*Complaint, error) {
	var c Complaint
	var reportedDate, createdAt, updatedAt string
	var attachmentsJSON, tagsJSON string
	var resolvedDate, followUpDate sql.NullString

	if err := scan(
		&c.ID, &c.ShopID, &c.Subject, &c.SubjectAr, &c.Description,
		&c.CustomerName, &c.CustomerEmail, &c.CustomerPhone,
		&c.Status, &c.Priority, &c.Category, &c.AssignedTo, &c.Department,
		&reportedDate, &resolvedDate, &c.Resolution,
		&c.FollowUpRequired, &followUpDate,
		&attachmentsJSON, &tagsJSON,
		&createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}

	c.ReportedDate = normalizeTime(reportedDate)
	c.CreatedAt = normalizeTime(createdAt)
	c.UpdatedAt = normalizeTime(updatedAt)
	if resolvedDate.Valid && resolvedDate.String != "" {
		t := normalizeTime(resolvedDate.String)
		c.ResolvedDate = &t
	}
	if followUpDate.Valid && followUpDate.String != "" {
		t := normalizeTime(followUpDate.String)
		c.FollowUpDate = &t
	}
	c.Attachments = decodeStringArray(attachmentsJSON)
	c.Tags = decodeStringArray(tagsJSON)
	return &c, nil
}

func normalizeTime(value string) string {
	t, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return value
	}
	return t.UTC().Format(time.RFC3339)
}

func decodeStringArray(raw string) []string {
	out := []string{}
	if raw == "" {
		return out
	}
	_ = json.Unmarshal([]byte(raw), &out)
	return out
}

func encodeStringArray(values []string) string {
	if values == nil {
		values = []string{}
	}
	b, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}
	return string(b)
}

// Create inserts a new complaint.
func (r *Repository) Create(ctx context.Context, data *CreateComplaintDTO) (*Complaint, error) {
	id := uuid.New().String()
	status := data.Status
	if status == "" {
		status = string(ComplaintStatusOpen)
	}
	priority := data.Priority
	if priority == "" {
		priority = string(ComplaintPriorityMedium)
	}
	reportedDate := data.ReportedDate
	if reportedDate == "" {
		reportedDate = time.Now().UTC().Format(time.RFC3339)
	}

	query := `
		INSERT INTO complaints (
			id, shop_id, subject, subject_ar, description,
			customer_name, customer_email, customer_phone,
			status, priority, category, assigned_to, department,
			reported_date, resolution, follow_up_required, follow_up_date,
			attachments, tags, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16, $17,
			$18::jsonb, $19::jsonb, NOW(), NOW()
		)
		RETURNING ` + complaintColumns

	row := r.pool.QueryRow(ctx, query,
		id, data.ShopID, data.Subject, data.SubjectAr, data.Description,
		data.CustomerName, data.CustomerEmail, data.CustomerPhone,
		status, priority, data.Category, data.AssignedTo, data.Department,
		reportedDate, data.Resolution, data.FollowUpRequired, nullIfEmpty(data.FollowUpDate),
		encodeStringArray(data.Attachments), encodeStringArray(data.Tags),
	)

	complaint, err := scanComplaint(row.Scan)
	if err != nil {
		return nil, fmt.Errorf("failed to create complaint: %w", err)
	}
	return complaint, nil
}

func nullIfEmpty(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}

// GetByID retrieves one complaint by ID.
func (r *Repository) GetByID(ctx context.Context, id string) (*Complaint, error) {
	query := `SELECT ` + complaintColumns + ` FROM complaints WHERE id = $1`
	row := r.pool.QueryRow(ctx, query, id)
	complaint, err := scanComplaint(row.Scan)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("complaint not found")
		}
		return nil, fmt.Errorf("failed to get complaint: %w", err)
	}
	return complaint, nil
}

// ListByShop lists complaints of a shop, newest first.
func (r *Repository) ListByShop(ctx context.Context, shopID string, status *string, limit, offset int) ([]Complaint, int64, error) {
	countQuery := `SELECT COUNT(*) FROM complaints WHERE shop_id = $1`
	args := []interface{}{shopID}
	query := `SELECT ` + complaintColumns + ` FROM complaints WHERE shop_id = $1`
	argIndex := 2

	if status != nil && *status != "" {
		countQuery += fmt.Sprintf(" AND status = $%d", argIndex)
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count complaints: %w", err)
	}

	query += fmt.Sprintf(" ORDER BY reported_date DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	listArgs := append(append([]interface{}{}, args...), limit, offset)

	rows, err := r.pool.Query(ctx, query, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query complaints: %w", err)
	}
	defer rows.Close()

	complaints := []Complaint{}
	for rows.Next() {
		complaint, err := scanComplaint(rows.Scan)
		if err != nil {
			continue
		}
		complaints = append(complaints, *complaint)
	}
	return complaints, total, nil
}

// Update patches a complaint; nil/empty fields keep their current value.
func (r *Repository) Update(ctx context.Context, id string, data *UpdateComplaintDTO) (*Complaint, error) {
	sets := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIndex := 1

	apply := func(column, value string) {
		sets = append(sets, fmt.Sprintf("%s = $%d", column, argIndex))
		args = append(args, value)
		argIndex++
	}

	if data.Subject != "" {
		apply("subject", data.Subject)
	}
	if data.SubjectAr != "" {
		apply("subject_ar", data.SubjectAr)
	}
	if data.Description != "" {
		apply("description", data.Description)
	}
	if data.CustomerName != "" {
		apply("customer_name", data.CustomerName)
	}
	if data.CustomerEmail != "" {
		apply("customer_email", data.CustomerEmail)
	}
	if data.CustomerPhone != "" {
		apply("customer_phone", data.CustomerPhone)
	}
	if data.Status != "" {
		apply("status", data.Status)
	}
	if data.Priority != "" {
		apply("priority", data.Priority)
	}
	if data.Category != "" {
		apply("category", data.Category)
	}
	if data.AssignedTo != "" {
		apply("assigned_to", data.AssignedTo)
	}
	if data.Department != "" {
		apply("department", data.Department)
	}
	if data.ReportedDate != "" {
		apply("reported_date", data.ReportedDate)
	}
	if data.ResolvedDate != nil {
		sets = append(sets, fmt.Sprintf("resolved_date = $%d", argIndex))
		if *data.ResolvedDate == "" {
			args = append(args, nil)
		} else {
			args = append(args, *data.ResolvedDate)
		}
		argIndex++
	}
	if data.Resolution != "" {
		apply("resolution", data.Resolution)
	}
	if data.FollowUpRequired != nil {
		sets = append(sets, fmt.Sprintf("follow_up_required = $%d", argIndex))
		args = append(args, *data.FollowUpRequired)
		argIndex++
	}
	if data.FollowUpDate != nil {
		sets = append(sets, fmt.Sprintf("follow_up_date = $%d", argIndex))
		if *data.FollowUpDate == "" {
			args = append(args, nil)
		} else {
			args = append(args, *data.FollowUpDate)
		}
		argIndex++
	}
	if data.Attachments != nil {
		sets = append(sets, fmt.Sprintf("attachments = $%d::jsonb", argIndex))
		args = append(args, encodeStringArray(data.Attachments))
		argIndex++
	}
	if data.Tags != nil {
		sets = append(sets, fmt.Sprintf("tags = $%d::jsonb", argIndex))
		args = append(args, encodeStringArray(data.Tags))
		argIndex++
	}

	args = append(args, id)
	query := fmt.Sprintf(`UPDATE complaints SET %s WHERE id = $%d RETURNING %s`,
		joinStrings(sets, ", "), argIndex, complaintColumns)

	row := r.pool.QueryRow(ctx, query, args...)
	complaint, err := scanComplaint(row.Scan)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("complaint not found")
		}
		return nil, fmt.Errorf("failed to update complaint: %w", err)
	}
	return complaint, nil
}

func joinStrings(parts []string, sep string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += sep
		}
		out += p
	}
	return out
}

// Delete removes one complaint.
func (r *Repository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM complaints WHERE id = $1`, id)
	return err
}

// BulkDelete removes many complaints and reports how many rows were removed.
func (r *Repository) BulkDelete(ctx context.Context, ids []string) (int64, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM complaints WHERE id = ANY($1::text[])`, ids)
	if err != nil {
		return 0, fmt.Errorf("failed to bulk delete complaints: %w", err)
	}
	return tag.RowsAffected(), nil
}
