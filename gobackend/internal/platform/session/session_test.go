package session

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore() *Store {
	// Long idle TTL, long absolute cap, 60s grace — tests control time via
	// explicit fields where needed.
	return NewStore(nil, 168*time.Hour, 720*time.Hour, 60*time.Second)
}

func TestCreateSessionStartsNewFamily(t *testing.T) {
	ctx := context.Background()
	s := newTestStore()

	sess := &Session{UserID: "u1", Email: "a@b.c", Role: "MERCHANT"}
	id, err := s.CreateSession(ctx, sess)
	require.NoError(t, err)
	require.NotEmpty(t, id)

	assert.Equal(t, id, sess.FamilyID, "family id defaults to the first session id")
	assert.False(t, sess.CreatedAt.IsZero())
	assert.False(t, sess.ExpiresAt.After(sess.CreatedAt.Add(720*time.Hour)), "expiry capped by absolute TTL")
}

func TestSetTokenHashBindsAndIndexes(t *testing.T) {
	ctx := context.Background()
	s := newTestStore()

	sess := &Session{UserID: "u1"}
	id, err := s.CreateSession(ctx, sess)
	require.NoError(t, err)

	require.NoError(t, s.SetTokenHash(ctx, id, "hash1"))
	got, err := s.GetSessionRaw(ctx, id)
	require.NoError(t, err)
	assert.Equal(t, "hash1", got.CurrentTokenHash)

	family, err := s.LookupTokenHash(ctx, "hash1")
	require.NoError(t, err)
	assert.Equal(t, sess.FamilyID, family)
}

func TestRotateSessionKeepsFamilyAndKillsOldRecord(t *testing.T) {
	ctx := context.Background()
	s := newTestStore()

	old := &Session{UserID: "u1", Email: "a@b.c"}
	oldID, err := s.CreateSession(ctx, old)
	require.NoError(t, err)
	require.NoError(t, s.SetTokenHash(ctx, oldID, "h1"))
	family := old.FamilyID
	createdAt := old.CreatedAt

	// Second binding on the same session (as a login-then-refresh adoption
	// would do) so Current/Previous differ before rotation.
	require.NoError(t, s.SetTokenHash(ctx, oldID, "h2"))

	newSess, newID, err := s.RotateSession(ctx, oldID)
	require.NoError(t, err)
	require.NotEmpty(t, newID)
	require.NotNil(t, newSess)

	assert.NotEqual(t, oldID, newID, "rotation must mint a new session id")
	assert.Equal(t, family, newSess.FamilyID, "family survives rotation")
	assert.True(t, createdAt.Equal(newSess.CreatedAt), "absolute-TTL anchor carries over")
	assert.Equal(t, "h2", newSess.PreviousTokenHash, "old current hash demoted to previous")

	// Old record is gone — no unbounded accumulation in Redis.
	dead, err := s.GetSessionRaw(ctx, oldID)
	require.NoError(t, err)
	assert.Nil(t, dead)

	// Old hash index survives so reuse can be traced back to the family.
	lookup, err := s.LookupTokenHash(ctx, "h2")
	require.NoError(t, err)
	assert.Equal(t, family, lookup)

	// Family pointer now targets the new generation.
	cur, err := s.GetCurrentSession(ctx, family)
	require.NoError(t, err)
	require.NotNil(t, cur)
	assert.Equal(t, newID, cur.ID)
}

func TestDeleteSessionFamilyRevokesEverything(t *testing.T) {
	ctx := context.Background()
	s := newTestStore()

	sess := &Session{UserID: "u1"}
	id, err := s.CreateSession(ctx, sess)
	require.NoError(t, err)
	require.NoError(t, s.SetTokenHash(ctx, id, "h1"))

	require.NoError(t, s.DeleteSessionFamily(ctx, sess.FamilyID))

	got, err := s.GetSessionRaw(ctx, id)
	require.NoError(t, err)
	assert.Nil(t, got, "session record revoked")

	family, err := s.LookupTokenHash(ctx, "h1")
	require.NoError(t, err)
	assert.Empty(t, family, "hash index revoked")

	cur, err := s.GetCurrentSession(ctx, sess.FamilyID)
	require.NoError(t, err)
	assert.Nil(t, cur, "family pointer revoked")
}

func TestAbsoluteTTLExpiresActiveSession(t *testing.T) {
	ctx := context.Background()
	// 1 hour idle (never the binding constraint) but a 40ms absolute cap.
	s := NewStore(nil, time.Hour, 40*time.Millisecond, time.Second)

	sess := &Session{UserID: "u1"}
	_, err := s.CreateSession(ctx, sess)
	require.NoError(t, err)

	time.Sleep(60 * time.Millisecond)

	got, err := s.GetSession(ctx, sess.ID)
	require.NoError(t, err)
	assert.Nil(t, got, "session must die at the absolute cap even while active")
}

func TestGraceWindowExposesConfiguredValue(t *testing.T) {
	s := NewStore(nil, time.Hour, time.Hour, 42*time.Second)
	assert.Equal(t, 42*time.Second, s.Grace())

	s = NewStore(nil, time.Hour, time.Hour, 0)
	assert.Equal(t, DefaultGrace, s.Grace())
}
