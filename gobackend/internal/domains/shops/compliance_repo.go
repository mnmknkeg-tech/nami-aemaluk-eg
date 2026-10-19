package shops

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// KYCData represents KYC submission data for a shop.
type KYCData struct {
	TaxRegistrationNumber   *string `json:"taxRegistrationNumber,omitempty"`
	CommercialRegistryNumber *string `json:"commercialRegistryNumber,omitempty"`
	IDDocumentURL           *string `json:"idDocumentUrl,omitempty"`
}

// KYCStatusData represents admin KYC status update.
type KYCStatusData struct {
	Status          string  `json:"status"`
	RejectionReason *string `json:"rejectionReason,omitempty"`
}

// UpdateKYC updates KYC data for a shop.
func (r *Repository) UpdateKYC(ctx context.Context, shopID string, data KYCData) (*Shop, error) {
	fields := map[string]any{}
	if data.TaxRegistrationNumber != nil {
		fields["tax_registration_number"] = *data.TaxRegistrationNumber
	}
	if data.CommercialRegistryNumber != nil {
		fields["commercial_registry_number"] = *data.CommercialRegistryNumber
	}
	if data.IDDocumentURL != nil {
		fields["id_document_url"] = *data.IDDocumentURL
	}

	if len(fields) == 0 {
		return r.FindByID(ctx, shopID)
	}

	return r.UpdateSettings(ctx, shopID, fields)
}

// UpdateKYCStatus updates the KYC verification status for a shop (admin).
func (r *Repository) UpdateKYCStatus(ctx context.Context, shopID string, data KYCStatusData) (*Shop, error) {
	fields := map[string]any{
		"kyc_status": data.Status,
	}

	if data.Status == "verified" {
		now := time.Now().UTC()
		fields["kyc_verified_at"] = now
		fields["kyc_rejection_reason"] = nil
	} else if data.Status == "rejected" && data.RejectionReason != nil {
		fields["kyc_rejection_reason"] = *data.RejectionReason
	}

	return r.UpdateSettings(ctx, shopID, fields)
}

// GetKYCStatus returns the KYC status for a shop.
func (r *Repository) GetKYCStatus(ctx context.Context, shopID string) (string, error) {
	var status string
	err := r.pool.QueryRow(ctx, "SELECT COALESCE(kyc_status, 'pending') FROM shops WHERE id = $1", shopID).Scan(&status)
	if err != nil {
		return "", fmt.Errorf("failed to get KYC status: %w", err)
	}
	return status, nil
}

// ShopPolicy represents a shop policy record.
type ShopPolicy struct {
	ID        string    `json:"id"`
	ShopID    string    `json:"shopId"`
	Type      string    `json:"type"`
	Content   string    `json:"content"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// GetPoliciesByShop returns policies for a shop by slug.
func (r *Repository) GetPoliciesByShop(ctx context.Context, shopID string) ([]ShopPolicy, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, shop_id, type, content, is_active, created_at, updated_at
		FROM shop_policies WHERE shop_id = $1 AND is_active = true ORDER BY type
	`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to query policies: %w", err)
	}
	defer rows.Close()

	var result []ShopPolicy
	for rows.Next() {
		var p ShopPolicy
		if err := rows.Scan(&p.ID, &p.ShopID, &p.Type, &p.Content, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}
		result = append(result, p)
	}
	return result, nil
}

// UpsertPolicy creates or updates a shop policy.
func (r *Repository) UpsertPolicy(ctx context.Context, shopID, policyType, content string) (*ShopPolicy, error) {
	now := time.Now().UTC()
	query := `
		INSERT INTO shop_policies (id, shop_id, type, content, is_active, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $4)
		ON CONFLICT (shop_id, type) DO UPDATE SET
			content = EXCLUDED.content,
			is_active = EXCLUDED.is_active,
			updated_at = EXCLUDED.updated_at
		RETURNING id, shop_id, type, content, is_active, created_at, updated_at
	`

	var p ShopPolicy
	err := r.pool.QueryRow(ctx, query, shopID, policyType, content, now).Scan(
		&p.ID, &p.ShopID, &p.Type, &p.Content, &p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert policy: %w", err)
	}
	return &p, nil
}

// AMLAlert represents an AML alert record.
type AMLAlert struct {
	ID               string    `json:"id"`
	EntityType       string    `json:"entityType"`
	EntityID         string    `json:"entityId"`
	AlertType        string    `json:"alertType"`
	ThresholdExceeded any       `json:"thresholdExceeded,omitempty"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// CreateAMLAlert inserts a new AML alert.
func (r *Repository) CreateAMLAlert(ctx context.Context, entityType, entityID, alertType string, thresholdExceeded any) (*AMLAlert, error) {
	now := time.Now().UTC()

	teJSON, _ := json.Marshal(thresholdExceeded)
	if teJSON == nil {
		teJSON = []byte("{}")
	}

	query := `
		INSERT INTO aml_alerts (id, entity_type, entity_id, alert_type, threshold_exceeded, status, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $5)
		RETURNING id, entity_type, entity_id, alert_type, threshold_exceeded, status, created_at, updated_at
	`

	var a AMLAlert
	var teRaw []byte
	err := r.pool.QueryRow(ctx, query, entityType, entityID, alertType, teJSON, now).Scan(
		&a.ID, &a.EntityType, &a.EntityID, &a.AlertType, &teRaw, &a.Status, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create AML alert: %w", err)
	}

	var parsed any
	json.Unmarshal(teRaw, &parsed)
	a.ThresholdExceeded = parsed
	return &a, nil
}

// GetMerchant24hVolume returns the total order volume for a merchant in the last 24 hours.
func (r *Repository) GetMerchant24hVolume(ctx context.Context, shopID string) (float64, error) {
	var total float64
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(total), 0)
		FROM orders
		WHERE shop_id = $1
		  AND created_at >= NOW() - INTERVAL '24 hours'
		  AND status NOT IN ('cancelled', 'refunded')
	`, shopID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get merchant volume: %w", err)
	}
	return total, nil
}