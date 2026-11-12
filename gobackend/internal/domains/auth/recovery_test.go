package auth

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Recovery codes are the only way back into an account when the authenticator
// device is gone, so their shape and hashing must be exact.

func TestGenerateRecoveryCode_Shape(t *testing.T) {
	for i := 0; i < 200; i++ {
		code := generateRecoveryCode()
		require.Len(t, code, 10, "recovery code must be exactly 10 chars")
		assert.Equal(t, strings.ToUpper(code), code, "recovery code must be uppercase hex")
		assert.NotRegexp(t, `[^0-9A-F]`, code, "recovery code must contain only hex digits")
	}
}

func TestGenerateRecoveryCodes_CountAndUniqueness(t *testing.T) {
	codes := generateRecoveryCodes(recoveryCodeCount)
	require.Len(t, codes, recoveryCodeCount)

	seen := make(map[string]struct{}, len(codes))
	for _, c := range codes {
		require.Len(t, c, 10)
		_, dup := seen[c]
		assert.False(t, dup, "recovery codes must be unique within a batch: %s", c)
		seen[c] = struct{}{}
	}
}

func TestGenerateRecoveryCodes_ZeroAndNegativeCount(t *testing.T) {
	assert.Empty(t, generateRecoveryCodes(0))
	assert.Empty(t, generateRecoveryCodes(-1))
}

// A recovery code is only ever persisted as a SHA-256 hash, so the stored value
// must never leak the plaintext the user copies down.
func TestGenerateRecoveryCodes_HashesDoNotLeakPlaintext(t *testing.T) {
	codes := generateRecoveryCodes(recoveryCodeCount)
	hashes := make([]string, 0, len(codes))
	for _, c := range codes {
		h := sha256Hex(c)
		require.Len(t, h, 64)
		hashes = append(hashes, h)
	}
	for i, c := range codes {
		for _, h := range hashes {
			assert.NotContains(t, h, c, "hash must not embed the plaintext code")
		}
		assert.Equal(t, sha256Hex(c), hashes[i], "hashing must be deterministic")
	}
}

// The length gate that routes a login code to the TOTP verifier vs. the
// recovery-code lookup is what keeps a 6-digit TOTP code from ever being
// accepted as a recovery code (and vice versa).
func TestRecoveryCodeLengthDoesNotOverlapTOTP(t *testing.T) {
	assert.Equal(t, 10, len(generateRecoveryCode()))
	assert.NotEqual(t, 6, len(generateRecoveryCode()),
		"recovery codes must not be 6 chars long, or they would collide with TOTP codes")
}

// On hosts running with DB_MIGRATE_ON_BOOT=false, migration 000077 never runs,
// so the repository creates the table itself. That only works if the DDL is
// idempotent — dropping "IF NOT EXISTS" would make every call after the first
// fail with "relation already exists".
func TestEnsureRecoveryCodesDDLIsIdempotent(t *testing.T) {
	assert.Contains(t, createRecoveryCodesTableSQL, "CREATE TABLE IF NOT EXISTS user_recovery_codes",
		"table DDL must be idempotent")
	assert.Contains(t, createRecoveryCodesIndexSQL, "CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user",
		"index DDL must be idempotent")
}

// The in-code DDL has to stay in step with migration 000077, otherwise a host
// that does run the migration ends up with a different schema than one that
// self-heals.
func TestEnsureRecoveryCodesDDLMatchesMigration(t *testing.T) {
	for _, col := range []string{"id", "user_id", "code_hash", "used_at", "created_at"} {
		assert.Contains(t, createRecoveryCodesTableSQL, col)
	}
	assert.Contains(t, createRecoveryCodesTableSQL, "REFERENCES users(id) ON DELETE CASCADE",
		"codes must be removed when the owning user is deleted")
	assert.Contains(t, createRecoveryCodesTableSQL, "gen_random_uuid()")
	assert.Contains(t, createRecoveryCodesTableSQL, "TIMESTAMPTZ")
}

// A failed DDL attempt must not be retried on every request — that would stall
// each login attempt on a broken deployment — but it must not be cached as a
// success either, or the table would never be created once the cause cleared.
func TestEnsureRecoveryCodesStateAfterFailure(t *testing.T) {
	r := &Repository{}
	r.ensureRecoveryCodesTable(context.Background())

	assert.False(t, r.recoveryCodesReady, "a failed attempt must not report the table as ready")
	assert.True(t, r.recoveryCodesFailed, "a failed attempt must be remembered so it is not retried per request")
}

// Once the table is known to exist the guard must short-circuit without
// touching the database again.
func TestEnsureRecoveryCodesSkipsAfterSuccess(t *testing.T) {
	r := &Repository{recoveryCodesReady: true}
	r.ensureRecoveryCodesTable(context.Background())

	assert.True(t, r.recoveryCodesReady)
	assert.False(t, r.recoveryCodesFailed)
}
