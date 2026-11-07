package orders

import (
	"strings"
	"testing"

	appErrors "github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/stretchr/testify/require"
)

func TestValidateIdempotencyKey(t *testing.T) {
	key, err := validateIdempotencyKey("request-42")
	require.NoError(t, err)
	require.Equal(t, "request-42", key)

	empty, err := validateIdempotencyKey("  ")
	require.NoError(t, err)
	require.Empty(t, empty)

	for _, invalid := range []string{"has space", "line\nbreak", strings.Repeat("x", 129)} {
		_, err := validateIdempotencyKey(invalid)
		appErr, ok := appErrors.IsAppError(err)
		require.True(t, ok)
		require.Equal(t, "idempotency_key_invalid", appErr.Code)
	}
}
