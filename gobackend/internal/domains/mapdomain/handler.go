package mapdomain

import (
	"strconv"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for map
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new map handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, config: cfg}
}

// RegisterRoutes registers map routes
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/map")
	g.Get("/pins", h.GetPins)

	ml := r.Group("/map-listings")
	ml.Post("/public/submit", h.SubmitListing) // must be before /:id routes
	ml.Get("/pending", h.ListPendingListings)
	ml.Get("/", h.ListPendingListings)
	ml.Post("/:id/approve", h.ApproveListing)
	ml.Post("/:id/reject", h.RejectListing)
}

// GetPins handles retrieving map pins
func (h *Handler) GetPins(c *fiber.Ctx) error {
	var lat, lng, radiusKm *float64

	if latStr := c.Query("lat"); latStr != "" {
		if v, err := strconv.ParseFloat(latStr, 64); err == nil {
			lat = &v
		}
	}
	if lngStr := c.Query("lng"); lngStr != "" {
		if v, err := strconv.ParseFloat(lngStr, 64); err == nil {
			lng = &v
		}
	}
	if rStr := c.Query("radiusKm"); rStr != "" {
		if v, err := strconv.ParseFloat(rStr, 64); err == nil {
			radiusKm = &v
		}
	}

	pins, err := h.service.GetPins(c.Context(), lat, lng, radiusKm)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(MapPinsResponse{
			Success: false,
			Error:   "Failed to retrieve map pins",
		})
	}

	return c.JSON(MapPinsResponse{
		Success: true,
		Data:    pins,
	})
}

// ListPendingListings handles GET /map-listings/pending
func (h *Handler) ListPendingListings(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	listings, err := h.service.ListPendingListings(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to retrieve map listings",
		})
	}
	return c.JSON(fiber.Map{
		"success": true,
		"data":    listings,
		"items":   listings,
	})
}

// ApproveListing handles POST /map-listings/:id/approve
func (h *Handler) ApproveListing(c *fiber.Ctx) error {
	id := c.Params("id")
	adminID := ""
	if user, ok := middleware.AuthUserFromContext(c); ok {
		adminID = user.ID
	}
	if err := h.service.SetListingStatus(c.Context(), id, "APPROVED", "", adminID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "فشل قبول الموقع",
		})
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم قبول الموقع بنجاح"})
}

// RejectListing handles POST /map-listings/:id/reject
func (h *Handler) RejectListing(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Note string `json:"note"`
	}
	_ = c.BodyParser(&body)
	adminID := ""
	if user, ok := middleware.AuthUserFromContext(c); ok {
		adminID = user.ID
	}
	if err := h.service.SetListingStatus(c.Context(), id, "REJECTED", body.Note, adminID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "فشل رفض الموقع",
		})
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم رفض الموقع"})
}

// SubmitListing handles POST /map-listings/public/submit
// Allows unauthenticated visitors (e.g. the business app's add-listing page)
// to submit a new map listing for admin review.
func (h *Handler) SubmitListing(c *fiber.Ctx) error {
	var req SubmitListingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(SubmitListingResponse{
			Success: false,
			Error:   "بيانات الطلب غير صالحة",
		})
	}

	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(SubmitListingResponse{
			Success: false,
			Error:   "العنوان مطلوب",
		})
	}
	if req.Branch.Latitude == 0 || req.Branch.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(SubmitListingResponse{
			Success: false,
			Error:   "إحداثيات الموقع مطلوبة",
		})
	}

	listingID, err := h.service.SubmitListing(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(SubmitListingResponse{
			Success: false,
			Error:   "فشل إنشاء الموقع",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(SubmitListingResponse{
		Success:   true,
		Message:   "تم إرسال موقعك للمراجعة بنجاح",
		ListingId: listingID,
	})
}
