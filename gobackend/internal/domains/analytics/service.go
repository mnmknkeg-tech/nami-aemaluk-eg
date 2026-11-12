package analytics

import (
	"context"
	"fmt"
)

// Service handles analytics business logic
type Service struct {
	repo    *Repository
	reports *reportsRepository
}

// NewService creates a new analytics service
func NewService(repo *Repository) *Service {
	return &Service{
		repo:    repo,
		reports: newReportsRepository(repo.pool),
	}
}

// GetSystemAnalytics retrieves overall system analytics
func (s *Service) GetSystemAnalytics(ctx context.Context, filter *MetricsFilter) (*SystemAnalytics, error) {
	return s.repo.GetSystemAnalytics(ctx, filter)
}

// GetTimeseriesData retrieves time-series data for metrics
func (s *Service) GetTimeseriesData(ctx context.Context, filter *MetricsFilter) ([]TimeseriesData, error) {
	return s.repo.GetTimeseriesData(ctx, filter)
}

// GetSystemActivity retrieves recent system activity
func (s *Service) GetSystemActivity(ctx context.Context, limit int) ([]ActivityEvent, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	return s.repo.GetSystemActivity(ctx, limit)
}

// GetShopAnalytics retrieves analytics for a specific shop
func (s *Service) GetShopAnalytics(ctx context.Context, shopID string, filter *MetricsFilter) (*ShopAnalytics, error) {
	return s.repo.GetShopAnalytics(ctx, shopID, filter)
}

// GetUserAnalytics retrieves analytics for a specific user
func (s *Service) GetUserAnalytics(ctx context.Context, userID string, filter *MetricsFilter) (*UserAnalytics, error) {
	return s.repo.GetUserAnalytics(ctx, userID, filter)
}

// GetProductPerformance retrieves performance metrics for products
func (s *Service) GetProductPerformance(ctx context.Context, shopID string, filter *MetricsFilter) ([]ProductPerformance, error) {
	return s.repo.GetProductPerformance(ctx, shopID, filter)
}

// GetConversionsAnalytics retrieves conversion analytics for a shop
func (s *Service) GetConversionsAnalytics(ctx context.Context, shopID string, filter *MetricsFilter) (*ConversionsAnalytics, error) {
	return s.reports.GetConversionsAnalytics(ctx, shopID, filter)
}

// GetProductPerformanceReport retrieves detailed product performance for a shop
func (s *Service) GetProductPerformanceReport(ctx context.Context, shopID string, filter *MetricsFilter) (*ProductPerformanceReport, error) {
	return s.reports.GetProductPerformanceReport(ctx, shopID, filter)
}

// GetAnalyticsOverview retrieves the overview summary for a shop
func (s *Service) GetAnalyticsOverview(ctx context.Context, shopID string, filter *MetricsFilter) (*AnalyticsOverview, error) {
	return s.reports.GetAnalyticsOverview(ctx, shopID, filter)
}

// GetSalesReport retrieves the sales report for a shop
func (s *Service) GetSalesReport(ctx context.Context, shopID string, filter *MetricsFilter) (*SalesReport, error) {
	return s.reports.GetSalesReport(ctx, shopID, filter)
}

// GetTrafficAnalytics retrieves traffic analytics for a shop
func (s *Service) GetTrafficAnalytics(ctx context.Context, shopID string, filter *MetricsFilter) (*TrafficAnalytics, error) {
	return s.reports.GetTrafficAnalytics(ctx, shopID, filter)
}

// GetCustomerInsights retrieves customer insights for a shop
func (s *Service) GetCustomerInsights(ctx context.Context, shopID string, filter *MetricsFilter) (*CustomerInsights, error) {
	return s.reports.GetCustomerInsights(ctx, shopID, filter)
}

// BuildFilter builds a MetricsFilter from request parameters
func (s *Service) BuildFilter(shopID, userID *string, timeRange TimeRange, startDate, endDate *string) *MetricsFilter {
	return &MetricsFilter{
		ShopID:    shopID,
		UserID:    userID,
		TimeRange: timeRange,
		StartDate: startDate,
		EndDate:   endDate,
	}
}

// ParseTimeRange parses a time range string
func (s *Service) ParseTimeRange(timeRange string) TimeRange {
	switch timeRange {
	case "today":
		return TimeRangeToday
	case "yesterday":
		return TimeRangeYesterday
	case "last_7_days":
		return TimeRangeLast7Days
	case "last_30_days":
		return TimeRangeLast30Days
	case "last_90_days":
		return TimeRangeLast90Days
	case "this_month":
		return TimeRangeThisMonth
	case "last_month":
		return TimeRangeLastMonth
	case "this_year":
		return TimeRangeThisYear
	case "custom":
		return TimeRangeCustom
	default:
		return TimeRangeLast7Days
	}
}

// CalculateGrowthRate calculates growth rate between two values
func (s *Service) CalculateGrowthRate(current, previous float64) float64 {
	if previous == 0 {
		return 0
	}
	return ((current - previous) / previous) * 100
}

// CalculateConversionRate calculates conversion rate
func (s *Service) CalculateConversionRate(conversions, total float64) float64 {
	if total == 0 {
		return 0
	}
	return (conversions / total) * 100
}

// CalculateAverage calculates average value
func (s *Service) CalculateAverage(total, count float64) float64 {
	if count == 0 {
		return 0
	}
	return total / count
}

// FormatRevenue formats revenue for display
func (s *Service) FormatRevenue(revenue float64) string {
	return fmt.Sprintf("%.2f", revenue)
}

// FormatPercentage formats percentage for display
func (s *Service) FormatPercentage(percentage float64) string {
	return fmt.Sprintf("%.1f%%", percentage)
}
