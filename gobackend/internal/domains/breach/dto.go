package breach

import (
	"time"
)

// BreachIncident represents a breach incident record.
type BreachIncident struct {
	ID                  string     `json:"id"`
	Title               string     `json:"title"`
	Description         string     `json:"description"`
	Severity            string     `json:"severity"`
	AffectedUsersCount  int        `json:"affectedUsersCount"`
	DiscoveredAt        time.Time  `json:"discoveredAt"`
	NotifiedRegulatorAt *time.Time `json:"notifiedRegulatorAt,omitempty"`
	NotifiedUsersAt     *time.Time `json:"notifiedUsersAt,omitempty"`
	Status              string     `json:"status"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// CreateBreachRequest is the payload for creating a breach incident.
type CreateBreachRequest struct {
	Title              string `json:"title"`
	Description        string `json:"description,omitempty"`
	Severity           string `json:"severity,omitempty"`
	AffectedUsersCount int    `json:"affectedUsersCount,omitempty"`
}

// UpdateBreachRequest is the payload for updating a breach incident.
type UpdateBreachRequest struct {
	Status string `json:"status"`
}