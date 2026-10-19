package dsr

import (
	"time"
)

// DataSubjectRequest represents a data subject rights request.
type DataSubjectRequest struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	RequestType string     `json:"requestType"`
	Status      string     `json:"status"`
	Details     any        `json:"details,omitempty"`
	AdminNotes  *string    `json:"adminNotes,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}

// CreateDSRRequest is the payload for submitting a DSR.
type CreateDSRRequest struct {
	RequestType string `json:"requestType"`
	Details     any    `json:"details,omitempty"`
}

// UpdateDSRRequest is the payload for admin updating a DSR.
type UpdateDSRRequest struct {
	Status     string  `json:"status"`
	AdminNotes *string `json:"adminNotes,omitempty"`
}