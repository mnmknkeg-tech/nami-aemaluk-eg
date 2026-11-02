package auth

import (
	"testing"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/session"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The rotation/grace/reuse state machine is the security heart of refresh —
// it must behave exactly as specified without needing Redis or a database.

func TestDecideRefresh_CurrentHashRotates(t *testing.T) {
	cur := &session.Session{
		CurrentTokenHash:  "h1",
		PreviousTokenHash: "h0",
		RotatedAt:         time.Now().UTC(),
	}
	assert.Equal(t, refreshRotate, decideRefresh(cur, "h1", time.Now().UTC(), time.Minute))
}

func TestDecideRefresh_LegacySessionWithoutHashRotates(t *testing.T) {
	// Sessions created before rotation shipped have no bound hash; their
	// first refresh adopts the new scheme instead of being flagged as theft.
	cur := &session.Session{}
	assert.Equal(t, refreshRotate, decideRefresh(cur, "anything", time.Now().UTC(), time.Minute))
}

func TestDecideRefresh_PreviousInsideGraceWindow(t *testing.T) {
	now := time.Now().UTC()
	cur := &session.Session{
		CurrentTokenHash:  "h1",
		PreviousTokenHash: "h0",
		RotatedAt:         now.Add(-10 * time.Second),
	}
	assert.Equal(t, refreshGrace, decideRefresh(cur, "h0", now, time.Minute),
		"a parallel tab presenting the pre-rotation token within the grace window must not be killed")
}

func TestDecideRefresh_PreviousOutsideGraceWindowIsReuse(t *testing.T) {
	now := time.Now().UTC()
	cur := &session.Session{
		CurrentTokenHash:  "h1",
		PreviousTokenHash: "h0",
		RotatedAt:         now.Add(-2 * time.Minute),
	}
	assert.Equal(t, refreshReuse, decideRefresh(cur, "h0", now, time.Minute),
		"replaying the previous token after the grace window is theft")
}

func TestDecideRefresh_OldGenerationIsReuse(t *testing.T) {
	now := time.Now().UTC()
	cur := &session.Session{
		CurrentTokenHash:  "h2",
		PreviousTokenHash: "h1",
		RotatedAt:         now,
	}
	assert.Equal(t, refreshReuse, decideRefresh(cur, "h0", now, time.Minute),
		"a token two generations old must always kill the family")
}

func TestDecideRefresh_UnknownHashIsReuse(t *testing.T) {
	cur := &session.Session{CurrentTokenHash: "h1"}
	assert.Equal(t, refreshReuse, decideRefresh(cur, "garbage", time.Now().UTC(), time.Minute))
}

func TestDecideRefresh_NilSessionIsReuse(t *testing.T) {
	assert.Equal(t, refreshReuse, decideRefresh(nil, "h1", time.Now().UTC(), time.Minute))
}

// Grace relies on re-signing the very same refresh token byte-for-byte.
func TestIssueRefreshTokenAt_IsDeterministic(t *testing.T) {
	ts, err := NewTokenService("test-secret-that-is-32-characters-min", 15*time.Minute, 168*time.Hour)
	require.NoError(t, err)

	user := User{ID: "user-1", Email: "a@b.c"}
	iat := time.Now().UTC().Truncate(time.Second)

	a, err := ts.IssueRefreshTokenAt(user, "session-1", iat)
	require.NoError(t, err)
	b, err := ts.IssueRefreshTokenAt(user, "session-1", iat)
	require.NoError(t, err)

	assert.Equal(t, a, b, "same session must reproduce the identical refresh token (grace invariant)")

	// Different iat → different token (rotation really rotates).
	c, err := ts.IssueRefreshTokenAt(user, "session-1", iat.Add(time.Second))
	require.NoError(t, err)
	assert.NotEqual(t, a, c)
}
