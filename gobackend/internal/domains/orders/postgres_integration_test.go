package orders

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
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestPostgresOrderIntegration(t *testing.T) {
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

	var migrationVersion int64
	var dirty bool
	require.NoError(t, pool.QueryRow(ctx, "SELECT version, dirty FROM schema_migrations LIMIT 1").
		Scan(&migrationVersion, &dirty))
	require.EqualValues(t, 88, migrationVersion)
	require.False(t, dirty)
	t.Logf("isolated PostgreSQL schema migrated to version %d", migrationVersion)

	repo := NewRepository(pool)
	service := NewService(&config.Config{App: config.AppConfig{Env: "test"}}, repo, nil)
	shopID, productID := seedOrderFixture(t, ctx, pool.Pool)

	phone := "201000000001"
	address := "Phase 12 integration test"
	requestKey := "phase12-" + uuid.NewString()
	clientTotal := 1.0
	req := CreateOrderRequest{
		ShopID:                shopID,
		Items:                 []CreateOrderItem{{ProductID: productID, Quantity: 2}},
		Total:                 &clientTotal,
		CustomerPhone:         &phone,
		DeliveryAddressManual: &address,
		IdempotencyKey:        requestKey,
	}
	created, err := service.CreateGuestOrder(ctx, req)
	require.NoError(t, err)
	require.Equal(t, 250.0, created.Total, "server should calculate the total from the product price")
	require.Empty(t, created.UserID)
	require.Equal(t, "guest", created.Source)
	require.Len(t, created.Items, 1)

	retrieved, err := repo.FindByID(ctx, created.ID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	require.Equal(t, created.ID, retrieved.ID)

	retried, err := service.CreateGuestOrder(ctx, req)
	require.NoError(t, err)
	require.Equal(t, created.ID, retried.ID, "same idempotency key and payload must return the original order")
	var stock int
	require.NoError(t, pool.QueryRow(ctx, "SELECT stock FROM products WHERE id = $1", productID).Scan(&stock))
	require.Equal(t, 3, stock, "retry must not decrement stock again")

	changedRequest := req
	changedRequest.Items = []CreateOrderItem{{ProductID: productID, Quantity: 1}}
	_, err = service.CreateGuestOrder(ctx, changedRequest)
	require.Error(t, err, "same key with a different payload must be rejected")

	_, foreignProductID := seedOrderFixture(t, ctx, pool.Pool)
	foreignProductRequest := req
	foreignProductRequest.IdempotencyKey = "phase12-" + uuid.NewString()
	foreignProductRequest.Items = []CreateOrderItem{{ProductID: foreignProductID, Quantity: 1}}
	_, err = service.CreateGuestOrder(ctx, foreignProductRequest)
	require.Error(t, err, "a product from another shop must not be orderable")

	unavailableStockRequest := req
	unavailableStockRequest.IdempotencyKey = "phase12-" + uuid.NewString()
	unavailableStockRequest.Items = []CreateOrderItem{{ProductID: productID, Quantity: 4}}
	_, err = service.CreateGuestOrder(ctx, unavailableStockRequest)
	require.Error(t, err, "quantity above available inventory must be rejected")
	require.NoError(t, pool.QueryRow(ctx, "SELECT stock FROM products WHERE id = $1", productID).Scan(&stock))
	require.Equal(t, 3, stock, "rejected inventory requests must not change stock")

	userID := uuid.NewString()
	_, err = pool.Exec(ctx, `
		INSERT INTO users (id, email, name, password, role, is_active, updated_at)
		VALUES ($1, $2, 'Phase 12 Customer', 'test-only-password-hash', 'CUSTOMER', true, NOW())`,
		userID, userID+"@phase12.invalid")
	require.NoError(t, err)
	authenticatedRequest := req
	authenticatedRequest.IdempotencyKey = "phase12-" + uuid.NewString()
	authenticatedRequest.Items = []CreateOrderItem{{ProductID: productID, Quantity: 1}}
	authenticated, err := service.CreateOrder(ctx, authenticatedRequest, userID, "CUSTOMER", "")
	require.NoError(t, err)
	require.Equal(t, userID, authenticated.UserID)
	require.Equal(t, "customer", authenticated.Source)
	require.Equal(t, 125.0, authenticated.Total)

	beforeRollbackCount := countShopOrders(t, ctx, pool.Pool, shopID)
	rollbackOrder := &Order{
		Total:  1,
		Status: OrderStatusPending,
		ShopID: shopID,
		Source: "guest",
		Items: []OrderItem{{
			ProductID:  uuid.NewString(),
			Quantity:   1,
			Price:      1,
			TrackStock: false,
		}},
	}
	_, _, err = repo.CreateOrder(ctx, rollbackOrder, "")
	require.Error(t, err, "invalid order item must fail its foreign-key constraint")
	require.Equal(t, beforeRollbackCount, countShopOrders(t, ctx, pool.Pool, shopID),
		"failed order item insert must roll back the parent order")
}

func seedOrderFixture(t *testing.T, ctx context.Context, pool *pgxpool.Pool) (string, string) {
	t.Helper()
	shopID, productID := uuid.NewString(), uuid.NewString()
	_, err := pool.Exec(ctx, `
		INSERT INTO shops (id, name, slug, category, governorate, city, phone, status, updated_at)
		VALUES ($1, 'Phase 12 Test Shop', $2, 'RESTAURANT', 'Cairo', 'Cairo', '201000000001', 'APPROVED', NOW())`,
		shopID, "phase12-"+shopID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO products (id, name, price, stock, track_stock, is_active, app_active, shop_id, updated_at)
		VALUES ($1, 'Phase 12 Test Product', 125, 5, true, true, true, $2, NOW())`,
		productID, shopID)
	require.NoError(t, err)
	return shopID, productID
}

func countShopOrders(t *testing.T, ctx context.Context, pool *pgxpool.Pool, shopID string) int {
	t.Helper()
	var count int
	require.NoError(t, pool.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE shop_id = $1", shopID).Scan(&count))
	return count
}
