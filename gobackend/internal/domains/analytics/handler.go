package analytics

import (
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for analytics
type Handler struct {
	service  *Service
	config   *config.Config
	validate *validator.Validate
}

// NewHandler creates a new analytics handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service:  service,
		config:   cfg,
		validate: validator.New(),
	}
}

// RegisterRoutes registers analytics routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	analytics := app.Group("/analytics")

	// System analytics routes (admin only)
	analytics.Get("/system", middleware.RequireAuth(h.config), h.GetSystemAnalytics)
	analytics.Get("/system/timeseries", middleware.RequireAuth(h.config), h.GetTimeseries)
	analytics.Get("/system/activity", middleware.RequireAuth(h.config), h.GetSystemActivity)

	// Shop analytics routes
	analytics.Get("/shop/:shopId", middleware.RequireAuth(h.config), h.GetShopAnalytics)

	// Shop analytics report pages (merchant-facing)
	analytics.Get("/shop/:shopId/conversions", middleware.RequireAuth(h.config), h.GetConversions)
	analytics.Get("/shop/:shopId/product-performance", middleware.RequireAuth(h.config), h.GetProductPerformanceReport)
	analytics.Get("/shop/:shopId/overview", middleware.RequireAuth(h.config), h.GetOverview)
	analytics.Get("/shop/:shopId/sales-report", middleware.RequireAuth(h.config), h.GetSalesReport)
	analytics.Get("/shop/:shopId/traffic", middleware.RequireAuth(h.config), h.GetTraffic)
	analytics.Get("/shop/:shopId/customer-insights", middleware.RequireAuth(h.config), h.GetCustomerInsights)

	// Frontend compatibility: sales-performance metric cards
	analytics.Get("/sales-performance/shop/:shopId", middleware.RequireAuth(h.config), h.GetSalesPerformance)

	// User analytics routes
	analytics.Get("/user/:userId", middleware.RequireAuth(h.config), h.GetUserAnalytics)

	// Page-visit tracking: public ingestion + admin-only reporting.
	// POST /analytics/visits is called by the public storefronts on every page
	// load (see pagevisits.go); the GET endpoints feed the admin dashboard.
	analytics.Post("/visits", h.RecordVisit)
	analytics.Get("/visits", middleware.RequireAuth(h.config), RequireVisitAdmin(), h.ListVisits)
	analytics.Get("/visits/stats", middleware.RequireAuth(h.config), RequireVisitAdmin(), h.GetVisitStats)
}

// GetSalesPerformance handles the dashboard metric cards: current vs previous
// half-window comparisons computed from the real sales trend.
func (h *Handler) GetSalesPerformance(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": err.Error()})
	}

	shopID := *filter.ShopID
	report, err := h.service.GetSalesReport(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "Failed to retrieve sales performance"})
	}

	trend := report.Trend
	half := len(trend) / 2
	if half <= 0 {
		return c.JSON(fiber.Map{"success": true, "data": []fiber.Map{}})
	}

	var curRev, prevRev float64
	var curOrd, prevOrd int64
	for i, p := range trend {
		if i < half {
			prevRev += p.Revenue
			prevOrd += p.Orders
		} else {
			curRev += p.Revenue
			curOrd += p.Orders
		}
	}

	trendOf := func(cur, prev float64) string {
		switch {
		case cur > prev:
			return "up"
		case cur < prev:
			return "down"
		default:
			return "stable"
		}
	}
	avg := func(rev float64, orders int64) float64 {
		if orders <= 0 {
			return 0
		}
		return rev / float64(orders)
	}

	metrics := []fiber.Map{
		{
			"id": "m-1", "name": "إجمالي الإيرادات", "category": "revenue",
			"value": curRev, "previousValue": prevRev, "unit": "ج.م",
			"trend": trendOf(curRev, prevRev),
		},
		{
			"id": "m-2", "name": "عدد الطلبات", "category": "orders",
			"value": curOrd, "previousValue": prevOrd, "unit": "طلب",
			"trend": trendOf(float64(curOrd), float64(prevOrd)),
		},
		{
			"id": "m-3", "name": "متوسط قيمة الطلب", "category": "orders",
			"value": avg(curRev, curOrd), "previousValue": avg(prevRev, prevOrd), "unit": "ج.م",
			"trend": trendOf(avg(curRev, curOrd), avg(prevRev, prevOrd)),
		},
	}

	return c.JSON(fiber.Map{"success": true, "data": metrics})
}

// GetSystemAnalytics handles system analytics request
func (h *Handler) GetSystemAnalytics(c *fiber.Ctx) error {
	var req GetSystemAnalyticsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(SystemAnalyticsResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(SystemAnalyticsResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check admin authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok || (user.Role != "admin" && user.Role != "ADMIN") {
		return c.Status(fiber.StatusForbidden).JSON(SystemAnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	filter := h.service.BuildFilter(nil, nil, req.TimeRange, req.StartDate, req.EndDate)
	analytics, err := h.service.GetSystemAnalytics(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(SystemAnalyticsResponse{
			Success: false,
			Error:   "Failed to retrieve system analytics",
		})
	}

	return c.JSON(SystemAnalyticsResponse{
		Success: true,
		Data:    analytics,
	})
}

// GetTimeseries handles time-series data request
func (h *Handler) GetTimeseries(c *fiber.Ctx) error {
	var req GetTimeseriesRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TimeseriesResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TimeseriesResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check admin authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok || (user.Role != "admin" && user.Role != "ADMIN") {
		return c.Status(fiber.StatusForbidden).JSON(TimeseriesResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	filter := h.service.BuildFilter(nil, nil, req.TimeRange, req.StartDate, req.EndDate)
	data, err := h.service.GetTimeseriesData(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TimeseriesResponse{
			Success: false,
			Error:   "Failed to retrieve timeseries data",
		})
	}

	return c.JSON(TimeseriesResponse{
		Success: true,
		Data:    data,
	})
}

// GetSystemActivity handles system activity request
func (h *Handler) GetSystemActivity(c *fiber.Ctx) error {
	var req GetActivityRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ActivityResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ActivityResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check admin authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok || (user.Role != "admin" && user.Role != "ADMIN") {
		return c.Status(fiber.StatusForbidden).JSON(ActivityResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	activity, err := h.service.GetSystemActivity(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ActivityResponse{
			Success: false,
			Error:   "Failed to retrieve system activity",
		})
	}

	return c.JSON(ActivityResponse{
		Success: true,
		Data:    activity,
	})
}

// GetShopAnalytics handles shop analytics request
func (h *Handler) GetShopAnalytics(c *fiber.Ctx) error {
	shopID := c.Params("shopId")

	var req GetShopAnalyticsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ShopAnalyticsResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	req.ShopID = shopID

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ShopAnalyticsResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ShopAnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Admin can access any shop, merchants can only access their own
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return c.Status(fiber.StatusForbidden).JSON(ShopAnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	filter := h.service.BuildFilter(&shopID, nil, req.TimeRange, req.StartDate, req.EndDate)
	analytics, err := h.service.GetShopAnalytics(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ShopAnalyticsResponse{
			Success: false,
			Error:   "Failed to retrieve shop analytics",
		})
	}

	return c.JSON(ShopAnalyticsResponse{
		Success: true,
		Data:    analytics,
	})
}

// GetUserAnalytics handles user analytics request
func (h *Handler) GetUserAnalytics(c *fiber.Ctx) error {
	userID := c.Params("userId")

	var req GetUserAnalyticsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(UserAnalyticsResponse{
			Success: false,
			Error:   "Invalid query parameters",
		})
	}

	req.UserID = userID

	if err := req.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(UserAnalyticsResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	// Check authorization
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(UserAnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	// Admin can access any user, users can only access their own
	if user.Role != "admin" && user.Role != "ADMIN" && user.ID != userID {
		return c.Status(fiber.StatusForbidden).JSON(UserAnalyticsResponse{
			Success: false,
			Error:   "Unauthorized",
		})
	}

	filter := h.service.BuildFilter(nil, &userID, req.TimeRange, req.StartDate, req.EndDate)
	analytics, err := h.service.GetUserAnalytics(c.Context(), userID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(UserAnalyticsResponse{
			Success: false,
			Error:   "Failed to retrieve user analytics",
		})
	}

	return c.JSON(UserAnalyticsResponse{
		Success: true,
		Data:    analytics,
	})
}

// ---------------------------------------------------------------------------
// Shop analytics report pages
// ---------------------------------------------------------------------------

// parseShopReportRequest parses a shop-scoped report request and checks authorization.
func (h *Handler) parseShopReportRequest(c *fiber.Ctx) (*MetricsFilter, error) {
	shopID := c.Params("shopId")
	if shopID == "" {
		return nil, fmt.Errorf("shop id is required")
	}

	var req GetShopAnalyticsReportRequest
	if err := c.QueryParser(&req); err != nil {
		return nil, fmt.Errorf("invalid query parameters")
	}
	req.ShopID = shopID
	if err := req.Validate(h.validate); err != nil {
		return nil, err
	}

	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return nil, fmt.Errorf("unauthorized")
	}
	if user.Role != "admin" && user.Role != "ADMIN" && user.ShopID != shopID {
		return nil, fmt.Errorf("unauthorized")
	}

	// Map frontend period (7d|30d|90d) to TimeRange if TimeRange not set.
	timeRange := req.TimeRange
	if timeRange == "" {
		switch req.Period {
		case "7d":
			timeRange = TimeRangeLast7Days
		case "30d":
			timeRange = TimeRangeLast30Days
		case "90d":
			timeRange = TimeRangeLast90Days
		default:
			timeRange = TimeRangeLast30Days
		}
	}

	return h.service.BuildFilter(&shopID, nil, timeRange, req.StartDate, req.EndDate), nil
}

// GetConversions handles the conversions analytics request
func (h *Handler) GetConversions(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ConversionsResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetConversionsAnalytics(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ConversionsResponse{Success: false, Error: "Failed to retrieve conversions analytics"})
	}

	return c.JSON(ConversionsResponse{Success: true, Data: data})
}

// GetProductPerformanceReport handles the product performance report request
func (h *Handler) GetProductPerformanceReport(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ProductPerformanceReportResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetProductPerformanceReport(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ProductPerformanceReportResponse{Success: false, Error: "Failed to retrieve product performance"})
	}

	return c.JSON(ProductPerformanceReportResponse{Success: true, Data: data})
}

// GetOverview handles the analytics overview request
func (h *Handler) GetOverview(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(AnalyticsOverviewResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetAnalyticsOverview(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AnalyticsOverviewResponse{Success: false, Error: "Failed to retrieve overview"})
	}

	return c.JSON(AnalyticsOverviewResponse{Success: true, Data: data})
}

// GetSalesReport handles the sales report request
func (h *Handler) GetSalesReport(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(SalesReportResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetSalesReport(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(SalesReportResponse{Success: false, Error: "Failed to retrieve sales report"})
	}

	return c.JSON(SalesReportResponse{Success: true, Data: data})
}

// GetTraffic handles the traffic analytics request
func (h *Handler) GetTraffic(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(TrafficAnalyticsResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetTrafficAnalytics(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TrafficAnalyticsResponse{Success: false, Error: "Failed to retrieve traffic analytics"})
	}

	return c.JSON(TrafficAnalyticsResponse{Success: true, Data: data})
}

// GetCustomerInsights handles the customer insights request
func (h *Handler) GetCustomerInsights(c *fiber.Ctx) error {
	filter, err := h.parseShopReportRequest(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(CustomerInsightsResponse{Success: false, Error: err.Error()})
	}

	shopID := *filter.ShopID
	data, err := h.service.GetCustomerInsights(c.Context(), shopID, filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(CustomerInsightsResponse{Success: false, Error: "Failed to retrieve customer insights"})
	}

	return c.JSON(CustomerInsightsResponse{Success: true, Data: data})
}
