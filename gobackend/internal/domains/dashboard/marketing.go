package dashboard

import (
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gofiber/fiber/v2"
)

// MarketingHub handles GET /marketing/hub/shop/:shopId.
func (h *Handler) MarketingHub(c *fiber.Ctx) error {
	_, shopID, ok := h.resolveShop(c, "")
	if !ok {
		return nil
	}

	rows, err := h.pool.Query(c.Context(), `
		SELECT id, status, data, created_at, updated_at
		FROM dashboard_entities
		WHERE shop_id = $1 AND kind IN ('campaign','email_campaign','sms_campaign','message','promotion')
		ORDER BY created_at DESC LIMIT 100`,
		shopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	defer rows.Close()

	campaigns := []map[string]any{}
	channelStats := map[string]*channelAgg{}
	totalCampaigns, activeCampaigns := 0, 0
	var totalReach float64

	for rows.Next() {
		var (
			id, status string
			dataRaw    string
			createdAt  time.Time
			updatedAt  time.Time
		)
		if err := rows.Scan(&id, &status, &dataRaw, &createdAt, &updatedAt); err != nil {
			continue
		}
		data := map[string]any{}
		_ = jsonUnmarshal(dataRaw, &data)

		channel := str(data["channel"], data["type"], "email")
		sent := num(data["recipientCount"], data["reach"])
		opened := num(data["openedCount"], nil)
		clicked := num(data["clickedCount"], nil)
		revenue := num(data["revenue"], data["budget"])

		totalCampaigns++
		if strings.EqualFold(status, "active") || strings.EqualFold(status, "running") {
			activeCampaigns++
		}
		totalReach += sent

		agg := channelStats[channel]
		if agg == nil {
			agg = &channelAgg{Channel: channel}
			channelStats[channel] = agg
		}
		agg.Count++
		agg.Sent += sent
		agg.Opened += opened
		agg.Clicked += clicked
		agg.Revenue += revenue

		endDate := ""
		if v, ok := data["endDate"].(string); ok {
			endDate = v
		} else if v, ok := data["end_date"].(string); ok {
			endDate = v
		}
		startDate := createdAt.Format(time.RFC3339)
		if v, ok := data["startDate"].(string); ok {
			startDate = v
		}
		name := str(data["name"], data["subject"], "حملة")
		campaigns = append(campaigns, map[string]any{
			"id": id, "name": name, "channel": channel, "status": strings.ToLower(status),
			"sentCount": sent, "openCount": opened, "clickCount": clicked,
			"revenue": revenue, "startDate": startDate, "endDate": endDate,
		})
	}

	totalEngagement := 0.0
	totalRevenue := 0.0
	channels := []map[string]any{}
	for _, agg := range channelStats {
		totalEngagement += agg.Opened + agg.Clicked
		totalRevenue += agg.Revenue
		roi := 0.0
		if agg.Sent > 0 {
			roi = (agg.Clicked / agg.Sent) * 100
		}
		channels = append(channels, map[string]any{
			"channel": agg.Channel, "campaigns": agg.Count, "sent": agg.Sent,
			"opened": agg.Opened, "clicked": agg.Clicked, "revenue": agg.Revenue,
			"conversionRate": roi,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"totalCampaigns":   totalCampaigns,
			"activeCampaigns":  activeCampaigns,
			"totalReach":       totalReach,
			"totalEngagement":  totalEngagement,
			"totalRevenue":     totalRevenue,
			"avgROI":           roiOf(totalReach, totalRevenue),
			"campaigns":        campaigns,
			"channelStats":     channels,
		},
	})
}

type channelAgg struct {
	Channel string
	Count   int
	Sent    float64
	Opened  float64
	Clicked float64
	Revenue float64
}

// CreateNotification handles POST /notifications — marketing push send.
func (h *Handler) CreateNotification(c *fiber.Ctx) error {
	user, ok := authUser(c)
	if !ok {
		return fail(c, fiber.StatusUnauthorized, "Unauthorized")
	}
	body, ok := parseBody(c)
	if !ok {
		return nil
	}
	shopID := str(body["shopId"], "")
	if shopID == "" {
		shopID = user.ShopID
	}
	if !strings.EqualFold(user.Role, "ADMIN") && shopID != user.ShopID {
		return fail(c, fiber.StatusForbidden, "Forbidden")
	}
	title := str(body["title"], "إشعار")
	content := str(body["body"], str(body["message"], ""))
	audience := str(body["audience"], "all")

	id := uuid.NewString()
	_, err := h.pool.Exec(c.Context(),
		`INSERT INTO notifications (id, title, content, type, priority, shop_id, is_read, created_at, updated_at)
		 VALUES ($1,$2,$3,'MARKETING','NORMAL',$4,false,NOW(),NOW())`,
		id, title, content, shopID,
	)
	if err != nil {
		return handleErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id": id, "title": title, "body": content,
			"audience": audience, "shopId": shopID, "status": "sent",
		},
	})
}
