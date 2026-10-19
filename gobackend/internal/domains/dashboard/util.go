package dashboard

import (
	"encoding/json"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/gofiber/fiber/v2"
)

func jsonUnmarshal(raw string, target any) error {
	return json.Unmarshal([]byte(raw), target)
}

func str(vals ...any) string {
	for _, v := range vals {
		switch t := v.(type) {
		case string:
			if t != "" {
				return t
			}
		}
	}
	if len(vals) > 0 {
		if s, ok := vals[len(vals)-1].(string); ok {
			return s
		}
	}
	return ""
}

func num(vals ...any) float64 {
	for _, v := range vals {
		switch t := v.(type) {
		case float64:
			return t
		case int:
			return float64(t)
		case int64:
			return float64(t)
		case json.Number:
			f, _ := t.Float64()
			return f
		}
	}
	return 0
}

func roiOf(reach, revenue float64) float64 {
	if reach <= 0 {
		return 0
	}
	return revenue / reach * 100
}

func authUser(c *fiber.Ctx) (middleware.AuthUser, bool) {
	return middleware.AuthUserFromContext(c)
}

func intPtrFromAny(v any) *int {
	switch t := v.(type) {
	case float64:
		i := int(t)
		return &i
	case int:
		return &t
	case json.Number:
		i64, _ := t.Int64()
		i := int(i64)
		return &i
	}
	return nil
}
