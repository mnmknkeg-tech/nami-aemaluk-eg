package pos

import (
	"time"
)

// Shift mirrors a cashier session as consumed by the dashboard POS pages.
type Shift struct {
	ID             string     `json:"id"`
	ShopID         string     `json:"shopId"`
	OpenedByID     *string    `json:"openedById,omitempty"`
	Status         string     `json:"status"`
	OpeningAmount  float64    `json:"openingAmount"`
	ClosingAmount  *float64   `json:"closingAmount"`
	ExpectedAmount *float64   `json:"expectedAmount"`
	Difference     *float64   `json:"difference"`
	TotalSales     float64    `json:"totalSales"`
	OrdersCount    int        `json:"ordersCount"`
	Note           *string    `json:"note"`
	OpenedAt       time.Time  `json:"openedAt"`
	ClosedAt       *time.Time `json:"closedAt"`
}

// Summary aggregates shift activity over a date range.
type Summary struct {
	Shifts       int              `json:"shifts"`
	TotalSales   float64          `json:"totalSales"`
	OrdersCount  int              `json:"ordersCount"`
	OpeningTotal float64          `json:"openingTotal"`
	ClosingTotal float64          `json:"closingTotal"`
	NetCash      float64          `json:"netCash"`
	Days         []SummaryDayStat `json:"byDay"`
}

// SummaryDayStat is one day inside the summary range.
type SummaryDayStat struct {
	Day         string  `json:"day"`
	Sales       float64 `json:"sales"`
	Orders      int     `json:"orders"`
	ShiftsCount int     `json:"shifts"`
}
