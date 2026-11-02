package analytics

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Device types accepted by page_visits.device_type.
const (
	DeviceDesktop = "desktop"
	DeviceMobile  = "mobile"
	DeviceTablet  = "tablet"
)

// PageVisit is a single recorded page view. It is written by the public
// storefronts (marketplace/business) and read by the admin dashboard only.
type PageVisit struct {
	ID         string `json:"id"`
	Path       string `json:"path"`
	Referrer   string `json:"referrer,omitempty"`
	DeviceType string `json:"device_type"`
	UserAgent  string `json:"user_agent,omitempty"`
	IPAddress  string `json:"ip_address,omitempty"`
	VisitorID  string `json:"visitor_id,omitempty"`
	UserID     string `json:"user_id,omitempty"`
	ShopID     string `json:"shop_id,omitempty"`
	CreatedAt  string `json:"created_at"`
}

// RecordPageVisitRequest is the body sent by the frontends on every page load.
type RecordPageVisitRequest struct {
	Path       string `json:"path" validate:"required,max=512"`
	Referrer   string `json:"referrer,omitempty" validate:"omitempty,max=1024"`
	DeviceType string `json:"device_type,omitempty" validate:"omitempty,oneof=desktop mobile tablet"`
	VisitorID  string `json:"visitor_id,omitempty" validate:"omitempty,max=128"`
	ShopID     string `json:"shop_id,omitempty" validate:"omitempty,max=128"`
}

// PageVisitDeviceCount holds the visit count for one device class.
type PageVisitDeviceCount struct {
	DeviceType string `json:"device_type"`
	Label      string `json:"label"`
	Visits     int64  `json:"visits"`
}

// PageVisitPathCount holds the visit count for one page path.
type PageVisitPathCount struct {
	Path   string `json:"path"`
	Visits int64  `json:"visits"`
}

// PageVisitDayCount holds the daily visit timeline entry.
type PageVisitDayCount struct {
	Date           string `json:"date"`
	Visits         int64  `json:"visits"`
	UniqueVisitors int64  `json:"unique_visitors"`
}

// PageVisitReferrerCount holds the visit count for one referrer source.
type PageVisitReferrerCount struct {
	Referrer string `json:"referrer"`
	Visits   int64  `json:"visits"`
}

// PageVisitStats is the aggregated admin report for page visits.
type PageVisitStats struct {
	TotalVisits    int64                    `json:"total_visits"`
	UniqueVisitors int64                    `json:"unique_visitors"`
	TodayVisits    int64                    `json:"today_visits"`
	LiveVisits     int64                    `json:"live_visits"`
	PagesCount     int64                    `json:"pages_count"`
	ByDevice       []PageVisitDeviceCount   `json:"by_device"`
	TopPages       []PageVisitPathCount     `json:"top_pages"`
	TopReferrers   []PageVisitReferrerCount `json:"top_referrers"`
	ByDay          []PageVisitDayCount      `json:"by_day"`
	Recent         []PageVisit              `json:"recent"`
}

// PageVisitFilter narrows a page-visit query.
type PageVisitFilter struct {
	DeviceType string
	Path       string
	Days       int
	Limit      int
	Offset     int
}

// normalizePageVisitFilter clamps client-supplied pagination/range values.
func normalizePageVisitFilter(f PageVisitFilter) PageVisitFilter {
	switch f.DeviceType {
	case DeviceDesktop, DeviceMobile, DeviceTablet:
	default:
		f.DeviceType = ""
	}
	if f.Days < 1 {
		f.Days = 7
	}
	if f.Days > 365 {
		f.Days = 365
	}
	if f.Limit < 1 {
		f.Limit = 50
	}
	if f.Limit > 200 {
		f.Limit = 200
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	f.Path = strings.TrimSpace(f.Path)
	return f
}

// where builds the shared WHERE clause/filter args for visit queries. args[0]
// is always the range start, bound to $1.
func (f PageVisitFilter) where(start time.Time) (string, []any) {
	clauses := []string{"created_at >= $1"}
	args := []any{start}
	if f.DeviceType != "" {
		args = append(args, f.DeviceType)
		clauses = append(clauses, fmt.Sprintf("device_type = $%d", len(args)))
	}
	if f.Path != "" {
		args = append(args, "%"+f.Path+"%")
		clauses = append(clauses, fmt.Sprintf("path ILIKE $%d", len(args)))
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

// detectDeviceType classifies a request as desktop, mobile or tablet from the
// User-Agent, falling back to the value reported by the client when the agent
// is missing or unrecognised.
func detectDeviceType(clientValue, userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "ipad"), strings.Contains(ua, "tablet"),
		(strings.Contains(ua, "android") && !strings.Contains(ua, "mobile")),
		strings.Contains(ua, "kindle"), strings.Contains(ua, "silk"):
		return DeviceTablet
	case strings.Contains(ua, "mobi"), strings.Contains(ua, "iphone"),
		strings.Contains(ua, "android"), strings.Contains(ua, "windows phone"),
		strings.Contains(ua, "blackberry"), strings.Contains(ua, "opera mini"):
		return DeviceMobile
	case strings.TrimSpace(ua) == "":
		switch clientValue {
		case DeviceMobile, DeviceTablet, DeviceDesktop:
			return clientValue
		}
		return DeviceDesktop
	default:
		return DeviceDesktop
	}
}

// deviceLabel returns the Arabic label used by the admin dashboard.
func deviceLabel(deviceType string) string {
	switch deviceType {
	case DeviceMobile:
		return "موبايل"
	case DeviceTablet:
		return "تابلت"
	default:
		return "كمبيوتر"
	}
}

// visitorFingerprint derives a pseudonymous visitor id (IP + User-Agent) so
// unique-visitor counting still works when the client cannot persist one.
func visitorFingerprint(ip, userAgent string) string {
	if ip == "" && userAgent == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(ip + "|" + userAgent))
	return hex.EncodeToString(sum[:16])
}

// normalizeIP keeps only syntactically valid IPs so the INET column insert
// cannot fail on a malformed X-Forwarded-For chain.
func normalizeIP(raw string) string {
	ip := strings.TrimSpace(raw)
	if ip == "" {
		return ""
	}
	if parsed := net.ParseIP(ip); parsed != nil {
		return parsed.String()
	}
	// X-Forwarded-For may carry a comma-separated chain.
	for _, part := range strings.Split(ip, ",") {
		if parsed := net.ParseIP(strings.TrimSpace(part)); parsed != nil {
			return parsed.String()
		}
	}
	return ""
}

// normalizeUUID blanks out non-UUID identifiers (e.g. dev fixtures) so the
// UUID columns accept the value.
func normalizeUUID(raw string) string {
	v := strings.TrimSpace(raw)
	if uuidPattern.MatchString(v) {
		return v
	}
	return ""
}

func truncate(s string, max int) string {
	if max <= 0 || len(s) <= max {
		return s
	}
	return s[:max]
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

const insertPageVisitSQL = `
	INSERT INTO page_visits (
		path, referrer, device_type, user_agent, ip_address, visitor_id, user_id, shop_id
	) VALUES (
		$1, NULLIF($2, ''), $3, NULLIF($4, ''), NULLIF($5, '')::inet,
		NULLIF($6, ''), NULLIF($7, '')::uuid, NULLIF($8, '')::uuid
	)
	RETURNING id::text, created_at
`

// InsertPageVisit stores one page view.
func (r *Repository) InsertPageVisit(ctx context.Context, v *PageVisit) error {
	if v == nil {
		return errors.Validation("visit_required", "بيانات الزيارة مطلوبة")
	}
	var id string
	var createdAt time.Time
	err := r.pool.QueryRow(ctx, insertPageVisitSQL,
		truncate(v.Path, 512),
		truncate(v.Referrer, 1024),
		v.DeviceType,
		truncate(v.UserAgent, 512),
		normalizeIP(v.IPAddress),
		truncate(v.VisitorID, 128),
		normalizeUUID(v.UserID),
		normalizeUUID(v.ShopID),
	).Scan(&id, &createdAt)
	if err != nil {
		return fmt.Errorf("insert page visit: %w", err)
	}
	v.ID = id
	v.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	return nil
}

const pageVisitColumns = `
	id::text, path, COALESCE(referrer, ''), device_type,
	COALESCE(user_agent, ''), COALESCE(ip_address::text, ''),
	COALESCE(visitor_id, ''), COALESCE(user_id::text, ''), COALESCE(shop_id::text, ''),
	created_at
`

// ListPageVisits returns the raw visit log (newest first) with the total count.
func (r *Repository) ListPageVisits(ctx context.Context, filter PageVisitFilter) ([]PageVisit, int64, error) {
	f := normalizePageVisitFilter(filter)
	start := time.Now().UTC().AddDate(0, 0, -f.Days)
	where, args := f.where(start)

	var total int64
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM page_visits"+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count page visits: %w", err)
	}

	args = append(args, f.Limit, f.Offset)
	query := fmt.Sprintf(
		"SELECT %s FROM page_visits%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		pageVisitColumns, where, len(args)-1, len(args),
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list page visits: %w", err)
	}
	defer rows.Close()

	visits := make([]PageVisit, 0)
	for rows.Next() {
		var v PageVisit
		var createdAt time.Time
		if err := rows.Scan(
			&v.ID, &v.Path, &v.Referrer, &v.DeviceType,
			&v.UserAgent, &v.IPAddress, &v.VisitorID,
			&v.UserID, &v.ShopID, &createdAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan page visit: %w", err)
		}
		v.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		visits = append(visits, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate page visits: %w", err)
	}
	return visits, total, nil
}

func (r *Repository) GetPageVisitStats(ctx context.Context, filter PageVisitFilter) (*PageVisitStats, error) {
	f := normalizePageVisitFilter(filter)
	now := time.Now().UTC()
	start := now.AddDate(0, 0, -f.Days)
	where, args := f.where(start)

	stats := &PageVisitStats{
		ByDevice:     make([]PageVisitDeviceCount, 0),
		TopPages:     make([]PageVisitPathCount, 0),
		TopReferrers: make([]PageVisitReferrerCount, 0),
		ByDay:        make([]PageVisitDayCount, 0),
		Recent:       make([]PageVisit, 0),
	}

	if err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*), COUNT(DISTINCT visitor_id), COUNT(DISTINCT path) FROM page_visits"+where,
		args...,
	).Scan(&stats.TotalVisits, &stats.UniqueVisitors, &stats.PagesCount); err != nil {
		return nil, fmt.Errorf("page visit totals: %w", err)
	}

	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM page_visits WHERE created_at >= $1", dayStart,
	).Scan(&stats.TodayVisits); err != nil {
		return nil, fmt.Errorf("page visits today: %w", err)
	}

	// Live visits: visits in the last 5 minutes
	liveStart := now.Add(-5 * time.Minute)
	if err := r.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM page_visits WHERE created_at >= $1", liveStart,
	).Scan(&stats.LiveVisits); err != nil {
		return nil, fmt.Errorf("page visits live: %w", err)
	}

	deviceRows, err := r.pool.Query(ctx,
		"SELECT device_type, COUNT(*) FROM page_visits"+where+" GROUP BY device_type ORDER BY COUNT(*) DESC",
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("page visits by device: %w", err)
	}
	for deviceRows.Next() {
		var item PageVisitDeviceCount
		if err := deviceRows.Scan(&item.DeviceType, &item.Visits); err != nil {
			deviceRows.Close()
			return nil, fmt.Errorf("scan device breakdown: %w", err)
		}
		item.Label = deviceLabel(item.DeviceType)
		stats.ByDevice = append(stats.ByDevice, item)
	}
	deviceRows.Close()
	if err := deviceRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate device breakdown: %w", err)
	}

	pageRows, err := r.pool.Query(ctx,
		"SELECT path, COUNT(*) AS visits FROM page_visits"+where+" GROUP BY path ORDER BY visits DESC LIMIT 15",
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("page visits top pages: %w", err)
	}
	for pageRows.Next() {
		var item PageVisitPathCount
		if err := pageRows.Scan(&item.Path, &item.Visits); err != nil {
			pageRows.Close()
			return nil, fmt.Errorf("scan top pages: %w", err)
		}
		stats.TopPages = append(stats.TopPages, item)
	}
	pageRows.Close()
	if err := pageRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate top pages: %w", err)
	}

	// Top referrers: exclude null/empty, group by host
	refRows, err := r.pool.Query(ctx,
		"SELECT COALESCE(referrer, 'مباشر'), COUNT(*) AS visits FROM page_visits"+
			where+
			" GROUP BY referrer ORDER BY visits DESC LIMIT 10",
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("page visits top referrers: %w", err)
	}
	for refRows.Next() {
		var item PageVisitReferrerCount
		if err := refRows.Scan(&item.Referrer, &item.Visits); err != nil {
			refRows.Close()
			return nil, fmt.Errorf("scan top referrers: %w", err)
		}
		stats.TopReferrers = append(stats.TopReferrers, item)
	}
	refRows.Close()
	if err := refRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate top referrers: %w", err)
	}

	dayRows, err := r.pool.Query(ctx,
		`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
		        COUNT(*), COUNT(DISTINCT visitor_id)
		 FROM page_visits`+where+
			" GROUP BY day ORDER BY day ASC",
		args...,
	)
	if err != nil {
		return nil, fmt.Errorf("page visits timeline: %w", err)
	}
	for dayRows.Next() {
		var item PageVisitDayCount
		if err := dayRows.Scan(&item.Date, &item.Visits, &item.UniqueVisitors); err != nil {
			dayRows.Close()
			return nil, fmt.Errorf("scan visit timeline: %w", err)
		}
		stats.ByDay = append(stats.ByDay, item)
	}
	dayRows.Close()
	if err := dayRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate visit timeline: %w", err)
	}

	recentFilter := f
	recentFilter.Limit = 25
	recentFilter.Offset = 0
	recent, _, err := r.ListPageVisits(ctx, recentFilter)
	if err != nil {
		return nil, err
	}
	stats.Recent = recent

	return stats, nil
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// RecordPageVisit stores one page view after normalising the payload.
func (s *Service) RecordPageVisit(ctx context.Context, visit *PageVisit) error {
	if visit == nil || strings.TrimSpace(visit.Path) == "" {
		return errors.Validation("path_required", "مسار الصفحة مطلوب")
	}
	if visit.DeviceType == "" {
		visit.DeviceType = DeviceDesktop
	}
	if visit.VisitorID == "" {
		visit.VisitorID = visitorFingerprint(visit.IPAddress, visit.UserAgent)
	}
	return s.repo.InsertPageVisit(ctx, visit)
}

// ListPageVisits returns the raw visit log for the admin table.
func (s *Service) ListPageVisits(ctx context.Context, filter PageVisitFilter) ([]PageVisit, int64, error) {
	return s.repo.ListPageVisits(ctx, filter)
}

// GetPageVisitStats returns the aggregated admin report.
func (s *Service) GetPageVisitStats(ctx context.Context, filter PageVisitFilter) (*PageVisitStats, error) {
	return s.repo.GetPageVisitStats(ctx, filter)
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

// RecordVisit ingests one page view from a public frontend. It is intentionally
// unauthenticated (like other public tracking endpoints) and always answers
// 202 so a tracking failure never breaks the page for the visitor.
func (h *Handler) RecordVisit(c *fiber.Ctx) error {
	var req RecordPageVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الزيارة")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	userAgent := truncate(c.Get("User-Agent"), 512)
	visit := &PageVisit{
		Path:       truncate(strings.TrimSpace(req.Path), 512),
		Referrer:   truncate(strings.TrimSpace(req.Referrer), 1024),
		DeviceType: detectDeviceType(req.DeviceType, userAgent),
		UserAgent:  userAgent,
		IPAddress:  normalizeIP(c.IP()),
		VisitorID:  truncate(strings.TrimSpace(req.VisitorID), 128),
		ShopID:     normalizeUUID(req.ShopID),
	}
	if visit.Path == "" {
		visit.Path = "/"
	}
	if userID, ok := c.Locals("user_id").(string); ok {
		visit.UserID = normalizeUUID(userID)
	}

	if err := h.service.RecordPageVisit(c.UserContext(), visit); err != nil {
		return errors.Internal("visit_record_failed", err)
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{"success": true, "data": fiber.Map{"recorded": true}})
}

// ListVisits returns the paginated page-visit log. Admin only.
func (h *Handler) ListVisits(c *fiber.Ctx) error {
	filter := parsePageVisitFilter(c)
	visits, total, err := h.service.ListPageVisits(c.UserContext(), filter)
	if err != nil {
		return errors.Internal("visits_list_failed", err)
	}

	limit := filter.Limit
	page := filter.Offset/limit + 1
	return c.JSON(fiber.Map{
		"success": true,
		"data":    visits,
		"meta": fiber.Map{
			"total":   total,
			"page":    page,
			"limit":   limit,
			"hasMore": int64(filter.Offset+len(visits)) < total,
		},
	})
}

// GetVisitStats returns the aggregated page-visit report. Admin only.
func (h *Handler) GetVisitStats(c *fiber.Ctx) error {
	stats, err := h.service.GetPageVisitStats(c.UserContext(), parsePageVisitFilter(c))
	if err != nil {
		return errors.Internal("visits_stats_failed", err)
	}
	return c.JSON(fiber.Map{"success": true, "data": stats})
}

// parsePageVisitFilter reads the shared visit filters from the query string.
func parsePageVisitFilter(c *fiber.Ctx) PageVisitFilter {
	days, _ := strconv.Atoi(c.Query("days"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}

	filter := normalizePageVisitFilter(PageVisitFilter{
		DeviceType: strings.TrimSpace(c.Query("device_type")),
		Path:       strings.TrimSpace(c.Query("path")),
		Days:       days,
		Limit:      limit,
	})
	filter.Offset = (page - 1) * filter.Limit
	return filter
}

// RequireVisitAdmin guards the page-visit reports so only admins can read them.
func RequireVisitAdmin() fiber.Handler {
	return middleware.RequireAdmin()
}
