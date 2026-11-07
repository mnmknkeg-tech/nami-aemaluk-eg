package middleware

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
)

func TestIdempotencyMiddlewareScopesResponsesToRequestAndIdentity(t *testing.T) {
	app := fiber.New()
	app.Use(NewIdempotencyStore(nil).Middleware())
	var executions atomic.Int32
	app.Post("/orders", func(c *fiber.Ctx) error {
		count := executions.Add(1)
		return c.SendString(fmt.Sprintf("%d:%s", count, c.Body()))
	})

	send := func(body, token string) string {
		request := httptest.NewRequest(http.MethodPost, "/orders", strings.NewReader(body))
		request.Header.Set("X-Idempotency-Key", "same-key")
		request.Header.Set("Authorization", "Bearer "+token)
		request.Header.Set("Content-Type", "application/json")
		response, err := app.Test(request)
		require.NoError(t, err)
		defer response.Body.Close()
		bodyBytes, err := io.ReadAll(response.Body)
		require.NoError(t, err)
		return string(bodyBytes)
	}

	first := send(`{"shopId":"shop-1"}`, "user-token-1")
	require.Equal(t, `1:{"shopId":"shop-1"}`, first)
	require.Equal(t, first, send(`{"shopId":"shop-1"}`, "user-token-1"))
	require.Equal(t, `2:{"shopId":"shop-2"}`, send(`{"shopId":"shop-2"}`, "user-token-1"))
	require.Equal(t, `3:{"shopId":"shop-1"}`, send(`{"shopId":"shop-1"}`, "user-token-2"))
}
