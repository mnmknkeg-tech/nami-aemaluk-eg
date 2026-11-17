package shopimagemap

import (
	"context"
	"net"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// TestShopImageMapPostgresIntegration guards the editor's persistence flow
// end to end: create → save layout with inline hotspots → reload → customer
// fetch. It pins the schema alignment between the repository and the
// migrations (000101 added name/layout and the sections/hotspots columns the
// repository reads) and the layout-JSON hotspot round trip.
func TestShopImageMapPostgresIntegration(t *testing.T) {
	dsn := os.Getenv("ORDERS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("ORDERS_TEST_DATABASE_URL is not set; PostgreSQL integration test not run")
	}

	parsed, err := url.Parse(dsn)
	require.NoError(t, err)
	host := parsed.Hostname()
	ip := net.ParseIP(host)
	require.True(t, strings.EqualFold(host, "localhost") || (ip != nil && ip.IsLoopback()),
		"test database must be on loopback; refusing to run against remote data")
	require.Contains(t, strings.ToLower(strings.TrimPrefix(parsed.Path, "/")), "test",
		"test database name must contain 'test'")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	pool, err := db.New(ctx, config.DBConfig{
		URL:             dsn,
		MaxOpenConns:    4,
		MaxIdleConns:    1,
		ConnMaxLifetime: time.Minute,
		ConnMaxIdleTime: time.Minute,
	}, zap.NewNop())
	require.NoError(t, err)
	defer pool.Close()

	shopID := uuid.NewString()
	slug := "imgmap-" + shopID
	_, err = pool.Exec(ctx, `
		INSERT INTO shops (id, name, slug, category, governorate, city, phone, status, updated_at)
		VALUES ($1, 'Image Map Test Shop', $2, 'RESTAURANT', 'Cairo', 'Cairo', '201000000099', 'APPROVED', NOW())`,
		shopID, slug)
	require.NoError(t, err)

	repo := NewRepository(pool)
	service := NewService(repo)

	// Create with the dashboard payload shape (title/imageUrl/isActive).
	created, err := service.Create(ctx, shopID, CreateMapRequest{
		Title:    "خريطة رئيسية",
		ImageURL: "https://cdn.example.test/map.webp",
		IsActive: true,
	}, "MERCHANT", shopID)
	require.NoError(t, err)
	require.Equal(t, "خريطة رئيسية", created.Name)
	require.Equal(t, "https://cdn.example.test/map.webp", created.ImageURL)
	require.True(t, created.IsActive, "isActive should be honored on create")

	// Save layout with inline sections + hotspots (dashboard PATCH shape).
	sections := []map[string]any{
		{"id": "sec-1", "name": "المدخل", "imageUrl": "https://cdn.example.test/entry.webp", "sortOrder": 0.0},
	}
	hotspots := []map[string]any{
		{"x": 12.5, "y": 33.0, "label": "قسم المشروبات", "sectionId": "sec-1", "width": 10.0, "height": 10.0, "sortOrder": 0.0},
		{"x": 55.0, "y": 70.5, "label": "الكاشير", "width": 8.0, "height": 8.0, "sortOrder": 1.0},
	}
	saved, err := service.SaveLayout(ctx, shopID, created.ID, SaveLayoutRequest{
		ImageURL: "https://cdn.example.test/map.webp",
		Title:    "خريطة رئيسية",
		Sections: sections,
		Hotspots: hotspots,
	}, "MERCHANT", shopID)
	require.NoError(t, err)
	require.Len(t, saved.Hotspots, 2, "save response should include the saved hotspots")
	require.Len(t, saved.Sections, 1)

	// Reload through the manage list — hotspots must survive the round trip.
	maps, err := service.ListForManage(ctx, shopID, "MERCHANT", shopID)
	require.NoError(t, err)
	require.Len(t, maps, 1)
	require.Len(t, maps[0].Hotspots, 2)
	first := maps[0].Hotspots[0]
	require.Equal(t, 12.5, first.X)
	require.Equal(t, 33.0, first.Y)
	require.NotNil(t, first.Label)
	require.Equal(t, "قسم المشروبات", *first.Label)
	require.NotNil(t, first.SectionID)
	require.Equal(t, "sec-1", *first.SectionID)
	require.Len(t, maps[0].Sections, 1)
	require.Equal(t, "المدخل", maps[0].Sections[0].Name)

	// Public customer fetch by slug returns the same content.
	active, err := service.GetActiveForCustomer(ctx, slug)
	require.NoError(t, err)
	require.NotNil(t, active)
	require.Equal(t, created.ID, active.ID)
	require.Len(t, active.Hotspots, 2)

	// Unknown map id maps to NotFound — not an internal error.
	_, err = service.SaveLayout(ctx, shopID, "map_does_not_exist", SaveLayoutRequest{}, "MERCHANT", shopID)
	require.Error(t, err)
	var appErr *errors.AppError
	require.ErrorAs(t, err, &appErr)
	require.Equal(t, errors.KindNotFound, appErr.Kind)
}
