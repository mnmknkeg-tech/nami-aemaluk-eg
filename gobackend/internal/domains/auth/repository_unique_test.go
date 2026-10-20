package auth

import (
	"fmt"
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTranslateUniqueViolation_MapsConstraintToConflict(t *testing.T) {
	cases := []struct {
		constraint string
		wantCode   string
	}{
		{"users_email_key", "email_already_exists"},
		{"users_phone_key", "phone_already_exists"},
		{"some_other_key", "duplicate_value"},
	}

	for _, tc := range cases {
		t.Run(tc.constraint, func(t *testing.T) {
			pgErr := &pgconn.PgError{
				Code:           "23505",
				ConstraintName: tc.constraint,
			}
			err := translateUniqueViolation(fmt.Errorf("insert failed: %w", pgErr))

			appErr, ok := errors.IsAppError(err)
			require.True(t, ok, "expected an AppError, got %T", err)
			assert.Equal(t, errors.KindConflict, appErr.Kind)
			assert.Equal(t, tc.wantCode, appErr.Code)
		})
	}
}

func TestTranslateUniqueViolation_PassesThroughOtherErrors(t *testing.T) {
	other := fmt.Errorf("connection refused")
	assert.Equal(t, other, translateUniqueViolation(other))

	// A non-uniqueness Postgres error must not be turned into a conflict.
	pgErr := &pgconn.PgError{Code: "23503", ConstraintName: "users_phone_key"}
	out := translateUniqueViolation(fmt.Errorf("insert failed: %w", pgErr))
	_, ok := errors.IsAppError(out)
	assert.False(t, ok, "expected the original error to pass through")
}

func TestTranslateUniqueViolation_NilSafe(t *testing.T) {
	assert.Nil(t, translateUniqueViolation(nil))
}
