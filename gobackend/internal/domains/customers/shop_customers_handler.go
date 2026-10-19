package customers

import (
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

/* ============================================================
 * راوتس العميل المركزي — CRUD + بحث + أرشفة + ملف + كشف حساب + ولاء
 * ============================================================ */

// RegisterShopCustomerRoutes — تُنادى من RegisterRoutes.
func (h *Handler) RegisterShopCustomerRoutes(app fiber.Router) {
	sc := app.Group("/shops/:shopId/customers")

	sc.Post("/", middleware.RequireAuth(h.config), h.CreateShopCustomerHandler)
	sc.Get("/", middleware.RequireAuth(h.config), h.ListShopCustomersHandler)
	sc.Get("/:id", middleware.RequireAuth(h.config), h.GetShopCustomerHandler)
	sc.Patch("/:id", middleware.RequireAuth(h.config), h.UpdateShopCustomerHandler)
	sc.Post("/:id/archive", middleware.RequireAuth(h.config), h.ArchiveShopCustomerHandler)
	sc.Post("/:id/restore", middleware.RequireAuth(h.config), h.ArchiveShopCustomerHandler)
	sc.Get("/:id/activity", middleware.RequireAuth(h.config), h.CustomerActivityHandler)
	sc.Get("/:id/statement", middleware.RequireAuth(h.config), h.CustomerStatementHandler)
	sc.Get("/:id/contact-log", middleware.RequireAuth(h.config), h.ListContactLogHandler)
	sc.Post("/:id/contact-log", middleware.RequireAuth(h.config), h.AddContactLogHandler)

	loyalty := app.Group("/shops/:shopId/loyalty")
	loyalty.Get("/settings", middleware.RequireAuth(h.config), h.GetLoyaltySettingsHandler)
	loyalty.Put("/settings", middleware.RequireAuth(h.config), h.SaveLoyaltySettingsHandler)
	loyalty.Get("/ledger", middleware.RequireAuth(h.config), h.ListLoyaltyLedgerHandler)
	loyalty.Post("/adjust", middleware.RequireAuth(h.config), h.AdjustLoyaltyHandler)
}

func (h *Handler) shopScopeOK(c *fiber.Ctx, shopID string) bool {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return false
	}
	return h.shopAllowed(user, shopID)
}

func unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "error": "Unauthorized"})
}

func forbidden(c *fiber.Ctx) error {
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "error": "Forbidden"})
}

// ─── CRUD ────────────────────────────────────────────────────

// CreateShopCustomerHandler — إنشاء عميل مع منع التكرار برقم الهاتف.
func (h *Handler) CreateShopCustomerHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	var req struct {
		Name              string           `json:"name"`
		Phone             string           `json:"phone"`
		Email             string           `json:"email"`
		Address           string           `json:"address"`
		City              string           `json:"city"`
		Country           string           `json:"country"`
		CustomerType      string           `json:"customerType"`
		CompanyName       string           `json:"companyName"`
		TaxNumber         string           `json:"taxNumber"`
		Branch            string           `json:"branch"`
		Source            string           `json:"source"`
		SegmentID         string           `json:"segmentId"`
		Tags              []string         `json:"tags"`
		Notes             string           `json:"notes"`
		ShippingAddresses []map[string]any `json:"shippingAddresses"`
		Addresses         []map[string]any `json:"addresses"`
		Status            string           `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if strings.TrimSpace(NormalizePhone(req.Phone)) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "رقم الهاتف مطلوب"})
	}

	// منع التكرار: نفس الهاتف = نفس العميل
	if existing, _ := h.service.repo.FindShopCustomerByPhone(c.Context(), shopID, req.Phone); existing != nil {
		return c.JSON(fiber.Map{"success": true, "data": existing, "created": false,
			"message": "العميل موجود بالفعل — تم استخدام السجل الموجود"})
	}

	if strings.TrimSpace(req.Name) == "" {
		req.Name = "عميل " + NormalizePhone(req.Phone)
	}
	if req.CustomerType == "" {
		req.CustomerType = "individual"
	}
	if req.Source == "" {
		req.Source = "manual"
	}
	if req.Status == "" {
		req.Status = "active"
	}

	customer := &ShopCustomer{
		ShopID: shopID, Name: strings.TrimSpace(req.Name), Email: strings.TrimSpace(req.Email),
		Phone: strings.TrimSpace(req.Phone), CustomerType: req.CustomerType,
		CompanyName: req.CompanyName, TaxNumber: req.TaxNumber, Status: req.Status,
		Address: req.Address, City: req.City, Country: req.Country, Branch: req.Branch,
		Source: req.Source, SegmentID: req.SegmentID, Tags: req.Tags, Notes: req.Notes,
		ShippingAddresses: req.ShippingAddresses, Addresses: req.Addresses,
	}
	if err := h.service.repo.CreateShopCustomer(c.Context(), customer); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل إنشاء العميل", "detail": err.Error()})
	}

	// نقاط التسجيل لو الولاء مفعّلة
	if settings, err := h.service.repo.GetLoyaltySettings(c.Context(), shopID); err == nil && settings.Enabled && settings.SignupPoints > 0 {
		_, _ = h.service.repo.AddLoyaltyEntry(c.Context(), shopID, customer.ID, settings.SignupPoints, "signup", "", "system")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": customer, "created": true})
}

// ListShopCustomersHandler — بحث وفلاتر موحدة.
func (h *Handler) ListShopCustomersHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	archived := c.Query("archived", "false") == "true"
	q := ShopCustomerQuery{
		Query:       strings.TrimSpace(c.Query("query")),
		Status:      strings.TrimSpace(c.Query("status")),
		Source:      strings.TrimSpace(c.Query("source")),
		SegmentID:   strings.TrimSpace(c.Query("segment")),
		TagID:       strings.TrimSpace(c.Query("tag")),
		DebtorsOnly: c.Query("debtors") == "true",
		Archived:    archived,
		Limit:       limit,
		Offset:      offset,
	}
	customers, total, err := h.service.repo.ListShopCustomers(c.Context(), shopID, q)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحميل العملاء", "detail": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "data": customers, "total": total})
}

// GetShopCustomerHandler — ملف العميل الموحد.
func (h *Handler) GetShopCustomerHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	customer, err := h.service.repo.GetShopCustomer(c.Context(), shopID, c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "العميل غير موجود"})
	}
	contactLog, _ := h.service.repo.ListContactLog(c.Context(), shopID, customer.ID, 20)
	return c.JSON(fiber.Map{"success": true, "data": customer, "contactLog": contactLog})
}

// UpdateShopCustomerHandler — تحديث جزئي.
func (h *Handler) UpdateShopCustomerHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	var fields map[string]any
	if err := c.BodyParser(&fields); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	// لو الهاتف اتغير: منع التكرار
	if phone, ok := fields["phone"].(string); ok {
		if existing, _ := h.service.repo.FindShopCustomerByPhone(c.Context(), shopID, phone); existing != nil && existing.ID != c.Params("id") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "error": "رقم الهاتف مسجل لعميل آخر"})
		}
	}
	customer, err := h.service.repo.UpdateShopCustomer(c.Context(), shopID, c.Params("id"), fields)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحديث العميل"})
	}
	return c.JSON(fiber.Map{"success": true, "data": customer})
}

// ArchiveShopCustomerHandler — أرشفة/استعادة (العمليات القديمة تبقى).
func (h *Handler) ArchiveShopCustomerHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	archived := !strings.HasSuffix(c.Path(), "/restore")
	customer, err := h.service.repo.SetShopCustomerArchived(c.Context(), shopID, c.Params("id"), archived)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحديث العميل"})
	}
	return c.JSON(fiber.Map{"success": true, "data": customer})
}

// ─── النشاط وكشف الحساب ──────────────────────────────────────

func (h *Handler) loadCustomer(c *fiber.Ctx, shopID string) (*ShopCustomer, error) {
	return h.service.repo.GetShopCustomer(c.Context(), shopID, c.Params("id"))
}

// CustomerActivityHandler — تبويبات النشاط (طلبات/مرتجعات).
func (h *Handler) CustomerActivityHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	customer, err := h.loadCustomer(c, shopID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "العميل غير موجود"})
	}
	kind := c.Query("type", "orders")
	rows, err := h.service.repo.CustomerActivity(c.Context(), shopID, customer.ID, customer.Phone, kind)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحميل النشاط", "detail": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "data": rows})
}

// CustomerStatementHandler — كشف حساب مدين/دائن.
func (h *Handler) CustomerStatementHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	customer, err := h.loadCustomer(c, shopID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "العميل غير موجود"})
	}
	statement, err := h.service.repo.CustomerStatement(c.Context(), shopID, customer.ID, customer.Phone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل بناء كشف الحساب", "detail": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "data": statement})
}

// ─── سجل التواصل ─────────────────────────────────────────────

func (h *Handler) ListContactLogHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	entries, err := h.service.repo.ListContactLog(c.Context(), shopID, c.Params("id"), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحميل سجل التواصل"})
	}
	return c.JSON(fiber.Map{"success": true, "data": entries})
}

func (h *Handler) AddContactLogHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	var req struct {
		Type       string `json:"type"`
		Content    string `json:"content"`
		FollowupAt string `json:"followupAt"`
		StaffName  string `json:"staffName"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if req.Type == "" {
		req.Type = "note"
	}
	if strings.TrimSpace(req.Content) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "المحتوى مطلوب"})
	}
	entry := ContactLogEntry{Type: req.Type, Content: req.Content, StaffName: req.StaffName}
	if req.FollowupAt != "" {
		entry.FollowupAt = &req.FollowupAt
	}
	if err := h.service.repo.AddContactLog(c.Context(), shopID, c.Params("id"), entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل حفظ السجل"})
	}
	entries, _ := h.service.repo.ListContactLog(c.Context(), shopID, c.Params("id"), 20)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": entries})
}

// ─── الولاء والمكافآت ────────────────────────────────────────

func (h *Handler) GetLoyaltySettingsHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	settings, err := h.service.repo.GetLoyaltySettings(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحميل إعدادات الولاء"})
	}
	return c.JSON(fiber.Map{"success": true, "data": settings})
}

func (h *Handler) SaveLoyaltySettingsHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	var req LoyaltySettings
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	req.ShopID = shopID
	if req.PointsPerCurrency <= 0 {
		req.PointsPerCurrency = 100
	}
	if req.Rules == nil {
		req.Rules = map[string]any{}
	}
	if err := h.service.repo.SaveLoyaltySettings(c.Context(), &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل حفظ الإعدادات"})
	}
	return c.JSON(fiber.Map{"success": true, "data": req})
}

func (h *Handler) ListLoyaltyLedgerHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	entries, err := h.service.repo.ListLoyaltyLedger(c.Context(), shopID, c.Query("customerId"), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تحميل سجل النقاط"})
	}
	return c.JSON(fiber.Map{"success": true, "data": entries})
}

// AdjustLoyaltyHandler — كل تعديل نقاط يمر من السجل (كسب/استبدال/يدوي).
func (h *Handler) AdjustLoyaltyHandler(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if !h.shopScopeOK(c, shopID) {
		if _, ok := middleware.AuthUserFromContext(c); !ok {
			return unauthorized(c)
		}
		return forbidden(c)
	}
	var req struct {
		CustomerID string `json:"customerId"`
		Delta      int    `json:"delta"`
		Reason     string `json:"reason"`
		StaffName  string `json:"staffName"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "Invalid request body"})
	}
	if req.CustomerID == "" || req.Delta == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "العميل وقيمة النقاط مطلوبة"})
	}
	if req.Delta < 0 {
		// منع الاستبدال لما الرصيد مش كفاية
		customer, err := h.service.repo.GetShopCustomer(c.Context(), shopID, req.CustomerID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "العميل غير موجود"})
		}
		if customer.LoyaltyBalance+req.Delta < 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "error": "رصيد النقاط غير كافٍ"})
		}
	}
	if req.Reason == "" {
		req.Reason = "manual"
	}
	balance, err := h.service.repo.AddLoyaltyEntry(c.Context(), shopID, req.CustomerID, req.Delta, req.Reason, "", req.StaffName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "error": "فشل تسجيل حركة النقاط"})
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"balance": balance}})
}
