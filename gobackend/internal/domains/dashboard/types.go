package dashboard

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/gofiber/fiber/v2"
)

// kindSpec describes one dashboard entity family served by the generic CRUD.
type kindSpec struct {
	Kind         string // value stored in dashboard_entities.kind
	NumberPrefix string // e.g. EXP -> EXP-000001
}

// entityKinds maps the URL segment used by the frontend to its spec.
var entityKinds = map[string]kindSpec{
	// Finance
	"expenses":        {Kind: "expense", NumberPrefix: "EXP"},
	"taxes":           {Kind: "tax", NumberPrefix: "TAX"},
	"accounts":        {Kind: "account", NumberPrefix: "ACC"},
	"wallets":         {Kind: "wallet", NumberPrefix: "WLT"},
	"journal":         {Kind: "journal_entry", NumberPrefix: "JE"},
	"cashflow-items":  {Kind: "cashflow_item", NumberPrefix: "CF"},
	// Marketing
	"promotions":         {Kind: "promotion", NumberPrefix: "PRM"},
	"campaigns":          {Kind: "campaign", NumberPrefix: "CMP"},
	"coupons":            {Kind: "coupon", NumberPrefix: "CPN"},
	"discounts":          {Kind: "discount", NumberPrefix: "DSC"},
	"messages":           {Kind: "message", NumberPrefix: "MSG"},
	"email-campaigns":    {Kind: "email_campaign", NumberPrefix: "EMC"},
	"sms-campaigns":      {Kind: "sms_campaign", NumberPrefix: "SMC"},
	"loyalty-programs":   {Kind: "loyalty_program", NumberPrefix: "LTP"},
	// Inventory ops
	"categories":     {Kind: "category", NumberPrefix: "CAT"},
	"variants":       {Kind: "variant", NumberPrefix: "VAR"},
	"stocktakes":     {Kind: "stocktake", NumberPrefix: "STK"},
	"suppliers":      {Kind: "supplier", NumberPrefix: "SUP"},
	"purchase-orders": {Kind: "purchase_order", NumberPrefix: "PO"},
	"warehouses":     {Kind: "warehouse", NumberPrefix: "WHS"},
	"transfers":      {Kind: "transfer", NumberPrefix: "TRF"},
	// CRM
	"complaints": {Kind: "complaint", NumberPrefix: "CMP"},
	// Customers extras
	"customer-segments": {Kind: "segment", NumberPrefix: "SEG"},
	"customer-tags":     {Kind: "tag", NumberPrefix: "TAG"},
	// Website content
	"pages": {Kind: "page", NumberPrefix: "PG"},
	"seo":   {Kind: "seo_setting", NumberPrefix: "SEO"},
	"blog":  {Kind: "blog_post", NumberPrefix: "BLG"},
}

// aliasGroups exposes the same CRUD surface under alternative prefixes used by
// some dashboard pages (e.g. /finance/journal).
var aliasGroups = []aliasSpec{
	{Route: "finance/journal", Target: "journal"},
}

type aliasSpec struct {
	Route  string
	Target string
}

// Handler serves the dashboard's simple-entity CRUD plus computed finance,
// marketing and inventory analytics endpoints.
type Handler struct {
	pool   *db.Pool
	config *config.Config
}

// NewHandler creates a new dashboard handler.
func NewHandler(pool *db.Pool, cfg *config.Config) *Handler {
	return &Handler{pool: pool, config: cfg}
}

func fail(c *fiber.Ctx, status int, msg string) error {
	return c.Status(status).JSON(map[string]any{"success": false, "error": msg})
}

const entityRowJSON = `jsonb_build_object(
		'id', e.id,
		'shopId', e.shop_id,
		'number', e.number,
		'status', COALESCE(e.status, ''),
		'data', e.data,
		'createdBy', COALESCE(e.created_by, ''),
		'createdAt', e.created_at,
		'updatedAt', e.updated_at
	)::text`

// flatten merges the stored data payload over the base row so every
// type-specific field appears at the top level, exactly how the pages read it.
func flatten(base string) (map[string]any, error) {
	row := map[string]any{}
	if err := json.Unmarshal([]byte(base), &row); err != nil {
		return nil, err
	}
	if raw, ok := row["data"]; ok {
		if dataStr, ok := raw.(string); ok {
			data := map[string]any{}
			if err := json.Unmarshal([]byte(dataStr), &data); err == nil {
				for k, v := range data {
					if _, exists := row[k]; !exists || k != "id" {
						row[k] = v
					}
				}
			}
		} else if dataMap, ok := raw.(map[string]any); ok {
			for k, v := range dataMap {
				if k != "id" {
					row[k] = v
				}
			}
		}
	}
	delete(row, "data")
	return row, nil
}

var reservedKeys = map[string]bool{
	"id": true, "shopId": true, "shop_id": true, "kind": true,
	"createdAt": true, "created_at": true, "updatedAt": true, "updated_at": true,
}

func splitPayload(body map[string]any) (status *string, number *string, data map[string]any) {
	data = map[string]any{}
	for k, v := range body {
		lk := strings.ToLower(k)
		switch lk {
		case "status":
			if s, ok := v.(string); ok && s != "" {
				status = &s
			}
		case "number":
			if s, ok := v.(string); ok && s != "" {
				number = &s
			}
		default:
			if !reservedKeys[lk] {
				data[k] = v
			}
		}
	}
	return status, number, data
}

func nextNumber(prefix string, seq int) string {
	return fmt.Sprintf("%s-%06d", prefix, seq)
}
