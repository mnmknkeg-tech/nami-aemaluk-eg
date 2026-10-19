package products

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/pagination"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes product HTTP endpoints.
type Handler struct {
	service *Service
	cfg     *config.Config
}

// NewHandler creates a products handler.
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

// RegisterRoutes wires the product endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/products")

	g.Get("/", h.List)
	g.Get("/:id", h.GetByID)

	g.Get("/manage/by-shop/:shopId", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ListManage)
	g.Post("/manage/by-shop/:shopId/import-drafts", middleware.RequireAuth(h.cfg), requireRolesMiddleware(auth.RoleMerchant, auth.RoleAdmin), h.ImportDrafts)

	g.Post("/", middleware.RequireAuth(h.cfg), h.Create)
	g.Patch("/:id", middleware.RequireAuth(h.cfg), h.Update)
	g.Delete("/:id", middleware.RequireAuth(h.cfg), h.Delete)
}

func (h *Handler) List(c *fiber.Ctx) error {
	req := parseProductListRequest(c)
	var products []Product
	var meta pagination.Meta
	var err error
	if req.ShopID != "" {
		products, meta, err = h.service.ListByShop(c.UserContext(), req)
	} else {
		products, meta, err = h.service.ListAllActive(c.UserContext(), req)
	}
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": products, "meta": meta})
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")
	user, ok := middleware.AuthUserFromContext(c)
	var shopID string
	if ok {
		shopID = user.ShopID
	}
	product, err := h.service.GetByID(c.UserContext(), id, shopID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": product})
}

func (h *Handler) ListManage(c *fiber.Ctx) error {
	shopID := c.Params("shopId")
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}
	req := parseManageListRequest(c)
	products, meta, err := h.service.ListByShopForManage(c.UserContext(), shopID, user.ShopID, user.Role, req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": products, "meta": meta})
}

func (h *Handler) Create(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	shopID := user.ShopID
	if user.Role == string(auth.RoleAdmin) {
		shopID = req.ShopID
	}
	if shopID == "" {
		return errors.Validation("shopId_required", "shopId مطلوب")
	}

	product, err := h.service.Create(c.UserContext(), req, shopID, user.ShopID, user.Role)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": product})
}

func (h *Handler) Update(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	var req UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	product, err := h.service.Update(c.UserContext(), id, req, user.ShopID, user.Role)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "data": product})
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	id := c.Params("id")
	if id == "" {
		return errors.Validation("id_required", "id مطلوب")
	}

	if err := h.service.Delete(c.UserContext(), id, user.ShopID, user.Role); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم حذف المنتج"})
}

// parseProductListRequest parses the query params for listing products.
func parseProductListRequest(c *fiber.Ctx) ProductListRequest {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	return ProductListRequest{
		ShopID:  c.Query("shopId"),
		Surface: c.Query("surface"),
		Page:    page,
		Limit:   limit,
		Filter:  parseProductFilter(c),
	}
}

// parseProductFilter extracts search/filter/sort from query params.
func parseProductFilter(c *fiber.Ctx) ProductFilter {
	minPrice, _ := strconv.ParseFloat(c.Query("minPrice", ""), 64)
	maxPrice, _ := strconv.ParseFloat(c.Query("maxPrice", ""), 64)
	return ProductFilter{
		Search:          c.Query("search"),
		Category:        c.Query("category"),
		MinPrice:        minPrice,
		MaxPrice:        maxPrice,
		Sort:            c.Query("sort"),
		IncludeImageMap: c.Query("includeImageMap") == "true",
		ShopActivity:    c.Query("shopActivity"),
	}
}

func parseManageListRequest(c *fiber.Ctx) ManageProductListRequest {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	include := c.Query("includeImageMap", "false")
	return ManageProductListRequest{
		Page:            page,
		Limit:           limit,
		IncludeImageMap: include == "true",
		Filter:          parseProductFilter(c),
	}
}

func requireRolesMiddleware(allowed ...auth.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user, ok := middleware.AuthUserFromContext(c)
		if !ok {
			return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
		}
		for _, r := range allowed {
			if auth.Role(user.Role) == r {
				return c.Next()
			}
		}
		return errors.Forbidden("insufficient_role", "ليس لديك صلاحية للوصول")
	}
}
