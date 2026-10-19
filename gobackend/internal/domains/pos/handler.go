package pos

import (
	"strconv"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for POS shifts.
type Handler struct {
	repo   *Repository
	config *config.Config
}

// NewHandler creates a new POS shifts handler.
func NewHandler(repo *Repository, cfg *config.Config) *Handler {
	return &Handler{repo: repo, config: cfg}
}

func fail(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(fiber.Map{"success": false, "error": msg})
}

// RegisterRoutes registers shift routes under /shops/:shopId/shifts.
func (h *Handler) RegisterRoutes(app fiber.Router) {
	g := app.Group("/shops/:shopId/shifts")

	g.Get("/active", middleware.RequireAuth(h.config), h.Active)
	g.Get("/summary", middleware.RequireAuth(h.config), h.Summary)
	g.Get("/", middleware.RequireAuth(h.config), h.List)
	g.Post("/", middleware.RequireAuth(h.config), h.Open)
	g.Post("/:shiftId/close", middleware.RequireAuth(h.config), h.Close)
}

func (h *Handler) guard(c *fiber.Ctx) (userID string, shopID string, ok bool) {
	user, authed := middleware.AuthUserFromContext(c)
	if !authed {
		fail(c, fiber.StatusUnauthorized, "Unauthorized")
		return "", "", false
	}
	shopID = c.Params("shopId")
	if !strings.EqualFold(user.Role, "ADMIN") && user.ShopID != shopID {
		fail(c, fiber.StatusForbidden, "Forbidden")
		return "", "", false
	}
	return user.ID, shopID, true
}

// Active handles GET /shops/:shopId/shifts/active.
func (h *Handler) Active(c *fiber.Ctx) error {
	_, shopID, ok := h.guard(c)
	if !ok {
		return nil
	}
	shift, err := h.repo.Active(c.Context(), shopID)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "Failed to load active shift")
	}
	return c.JSON(fiber.Map{"success": true, "data": shift})
}

// List handles GET /shops/:shopId/shifts?take=20.
func (h *Handler) List(c *fiber.Ctx) error {
	_, shopID, ok := h.guard(c)
	if !ok {
		return nil
	}
	take := 20
	if v, err := strconv.Atoi(c.Query("take")); err == nil && v > 0 {
		take = v
	}
	shifts, err := h.repo.List(c.Context(), shopID, take)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "Failed to list shifts")
	}
	if shifts == nil {
		shifts = []*Shift{}
	}
	return c.JSON(fiber.Map{"success": true, "data": shifts})
}

// Open handles POST /shops/:shopId/shifts { openingAmount }.
func (h *Handler) Open(c *fiber.Ctx) error {
	userID, shopID, ok := h.guard(c)
	if !ok {
		return nil
	}
	var req struct {
		OpeningAmount float64 `json:"openingAmount"`
	}
	if err := c.BodyParser(&req); err != nil {
		req.OpeningAmount = 0
	}
	shift, err := h.repo.Open(c.Context(), shopID, userID, req.OpeningAmount)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": shift})
}

// Close handles POST /shops/:shopId/shifts/:shiftId/close { closingAmount, note }.
func (h *Handler) Close(c *fiber.Ctx) error {
	_, shopID, ok := h.guard(c)
	if !ok {
		return nil
	}
	var req struct {
		ClosingAmount float64  `json:"closingAmount"`
		Note          *string  `json:"note"`
	}
	if err := c.BodyParser(&req); err != nil {
		return fail(c, fiber.StatusBadRequest, "Invalid request body")
	}
	shift, err := h.repo.Close(c.Context(), shopID, c.Params("shiftId"), req.ClosingAmount, req.Note)
	if err != nil {
		return fail(c, fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"success": true, "data": shift})
}

// Summary handles GET /shops/:shopId/shifts/summary?from&to.
func (h *Handler) Summary(c *fiber.Ctx) error {
	_, shopID, ok := h.guard(c)
	if !ok {
		return nil
	}
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -7)
	to := now
	if v, err := time.Parse("2006-01-02", c.Query("from")); err == nil {
		from = v
	}
	if v, err := time.Parse("2006-01-02", c.Query("to")); err == nil {
		to = v
	}
	sum, err := h.repo.Summary(c.Context(), shopID, from, to)
	if err != nil {
		return fail(c, fiber.StatusInternalServerError, "Failed to build summary")
	}
	return c.JSON(fiber.Map{"success": true, "data": sum})
}
