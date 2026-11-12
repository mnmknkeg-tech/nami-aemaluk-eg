package consent

import (
	"context"
	"time"
)

// UserConsent represents a user consent record.
type UserConsent struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	ConsentType string     `json:"consentType"`
	Granted     bool       `json:"granted"`
	GrantedAt   time.Time  `json:"grantedAt"`
	RevokedAt   *time.Time `json:"revokedAt,omitempty"`
	IPAddress   string     `json:"ipAddress"`
	UserAgent   string     `json:"userAgent"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// ConsentRequest is the payload for granting/revoking consent.
type ConsentRequest struct {
	ConsentType string `json:"consentType"`
	Granted     bool   `json:"granted"`
}

// Service handles consent business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new consent service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GrantOrRevoke creates or updates a consent record.
func (s *Service) GrantOrRevoke(ctx context.Context, userID, consentType string, granted bool, ip, ua string) (*UserConsent, error) {
	return s.repo.Upsert(ctx, userID, consentType, granted, ip, ua)
}

// ListByUser returns all consents for a user.
func (s *Service) ListByUser(ctx context.Context, userID string) ([]UserConsent, error) {
	return s.repo.FindByUser(ctx, userID)
}

// Revoke revokes a specific consent for a user.
func (s *Service) Revoke(ctx context.Context, userID, consentType string) (*UserConsent, error) {
	return s.repo.RevokeByType(ctx, userID, consentType)
}