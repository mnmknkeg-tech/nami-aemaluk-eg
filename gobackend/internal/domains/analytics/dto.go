package analytics

import "github.com/go-playground/validator/v10"

// GetSystemAnalyticsRequest represents a request for system analytics
type GetSystemAnalyticsRequest struct {
	TimeRange TimeRange `json:"time_range,omitempty" validate:"omitempty,oneof=today yesterday last_7_days last_30_days last_90_days this_month last_month this_year custom"`
	StartDate *string  `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string  `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
}

// Validate validates the request
func (r *GetSystemAnalyticsRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// GetTimeseriesRequest represents a request for time-series data
type GetTimeseriesRequest struct {
	Days      int      `json:"days,omitempty" validate:"omitempty,min=1,max=90"`
	TimeRange TimeRange `json:"time_range,omitempty" validate:"omitempty,oneof=today yesterday last_7_days last_30_days last_90_days this_month last_month this_year custom"`
	StartDate *string  `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string  `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
}

// Validate validates the request
func (r *GetTimeseriesRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// GetActivityRequest represents a request for activity data
type GetActivityRequest struct {
	Limit int `json:"limit,omitempty" validate:"omitempty,min=1,max=50"`
}

// Validate validates the request
func (r *GetActivityRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// GetShopAnalyticsRequest represents a request for shop analytics
type GetShopAnalyticsRequest struct {
	ShopID    string    `json:"shop_id" validate:"required,uuid"`
	TimeRange TimeRange `json:"time_range,omitempty" validate:"omitempty,oneof=today yesterday last_7_days last_30_days last_90_days this_month last_month this_year custom"`
	StartDate *string   `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string   `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
}

// Validate validates the request
func (r *GetShopAnalyticsRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// GetUserAnalyticsRequest represents a request for user analytics
type GetUserAnalyticsRequest struct {
	UserID    string    `json:"user_id" validate:"required,uuid"`
	TimeRange TimeRange `json:"time_range,omitempty" validate:"omitempty,oneof=today yesterday last_7_days last_30_days last_90_days this_month last_month this_year custom"`
	StartDate *string   `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string   `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
}

// Validate validates the request
func (r *GetUserAnalyticsRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// AnalyticsResponse represents a generic analytics response
type AnalyticsResponse struct {
	Success bool   `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// SystemAnalyticsResponse represents system analytics response
type SystemAnalyticsResponse struct {
	Success bool             `json:"success"`
	Data    *SystemAnalytics `json:"data,omitempty"`
	Error   string           `json:"error,omitempty"`
}

// TimeseriesResponse represents time-series data response
type TimeseriesResponse struct {
	Success bool             `json:"success"`
	Data    []TimeseriesData `json:"data,omitempty"`
	Error   string           `json:"error,omitempty"`
}

// ActivityResponse represents activity data response
type ActivityResponse struct {
	Success bool           `json:"success"`
	Data    []ActivityEvent `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// ShopAnalyticsResponse represents shop analytics response
type ShopAnalyticsResponse struct {
	Success bool           `json:"success"`
	Data    *ShopAnalytics `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// UserAnalyticsResponse represents user analytics response
type UserAnalyticsResponse struct {
	Success bool           `json:"success"`
	Data    *UserAnalytics `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
}

// GetShopAnalyticsReportRequest represents a request for shop analytics report pages
type GetShopAnalyticsReportRequest struct {
	ShopID    string    `query:"shop_id" validate:"required"`
	TimeRange TimeRange `query:"time_range,omitempty" validate:"omitempty,oneof=today yesterday last_7_days last_30_days last_90_days this_month last_month this_year custom"`
	StartDate *string   `query:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string   `query:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Period    string    `query:"period,omitempty"` // 7d | 30d | 90d (used by frontend)
}

// Validate validates the request
func (r *GetShopAnalyticsReportRequest) Validate(v *validator.Validate) error {
	return v.Struct(r)
}

// ConversionsResponse represents conversions analytics response
type ConversionsResponse struct {
	Success bool                  `json:"success"`
	Data    *ConversionsAnalytics `json:"data,omitempty"`
	Error   string                `json:"error,omitempty"`
}

// ProductPerformanceReportResponse represents product performance report response
type ProductPerformanceReportResponse struct {
	Success bool                       `json:"success"`
	Data    *ProductPerformanceReport  `json:"data,omitempty"`
	Error   string                     `json:"error,omitempty"`
}

// AnalyticsOverviewResponse represents analytics overview response
type AnalyticsOverviewResponse struct {
	Success bool               `json:"success"`
	Data    *AnalyticsOverview `json:"data,omitempty"`
	Error   string             `json:"error,omitempty"`
}

// SalesReportResponse represents sales report response
type SalesReportResponse struct {
	Success bool          `json:"success"`
	Data    *SalesReport  `json:"data,omitempty"`
	Error   string        `json:"error,omitempty"`
}

// TrafficAnalyticsResponse represents traffic analytics response
type TrafficAnalyticsResponse struct {
	Success bool              `json:"success"`
	Data    *TrafficAnalytics `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
}

// CustomerInsightsResponse represents customer insights response
type CustomerInsightsResponse struct {
	Success bool              `json:"success"`
	Data    *CustomerInsights `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
}
