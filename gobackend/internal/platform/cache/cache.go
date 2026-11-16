// Package cache provides a small in-process TTL cache for hot public reads.
// It is intentionally dependency-free: a single instance per API process absorbs
// repeated identical queries (marketplace homepage, shops/products lists) so the
// database is not hit for every visitor. Entries are stale after TTL and the
// map is pruned lazily; an explicit Delete lets write paths invalidate keys.
package cache

import (
	"encoding/json"
	"sync"
	"time"
)

const (
	defaultTTL      = 30 * time.Second
	maxEntries      = 4096
	pruneThreshold  = maxEntries + 512
	pruneInterval   = time.Minute
	initialCapacity = 64
)

type entry struct {
	value     []byte
	expiresAt time.Time
}

type loadCall struct {
	done chan struct{}
	raw  []byte
	err  error
}

// Cache is a goroutine-safe TTL cache. The zero value is not usable; call New.
type Cache struct {
	mu         sync.RWMutex
	items      map[string]entry
	loads      map[string]*loadCall
	generation uint64
	nowFunc    func() time.Time
}

// New creates a ready-to-use cache and starts a background pruner.
func New() *Cache {
	c := &Cache{
		items:   make(map[string]entry, initialCapacity),
		loads:   make(map[string]*loadCall),
		nowFunc: time.Now,
	}
	go c.pruneLoop()
	return c
}

// Get returns the cached bytes for key and whether they are still fresh.
func (c *Cache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	e, ok := c.items[key]
	now := c.nowFunc()
	if !ok || now.After(e.expiresAt) {
		c.mu.RUnlock()
		return nil, false
	}
	value := append([]byte(nil), e.value...)
	c.mu.RUnlock()
	return value, true
}

// Set stores value under key for ttl. A non-positive ttl uses the default.
func (c *Cache) Set(key string, value []byte, ttl time.Duration) {
	if ttl <= 0 {
		ttl = defaultTTL
	}
	c.mu.Lock()
	c.setLocked(key, value, ttl)
	c.mu.Unlock()
}

// setLocked stores a copied value while the write lock is held.
func (c *Cache) setLocked(key string, value []byte, ttl time.Duration) {
	if ttl <= 0 {
		ttl = defaultTTL
	}
	if len(c.items) >= pruneThreshold {
		c.pruneLocked()
	}
	c.items[key] = entry{
		value:     append([]byte(nil), value...),
		expiresAt: c.nowFunc().Add(ttl),
	}
}

// Delete removes a key (cache invalidation after writes).
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.generation++
	c.mu.Unlock()
}

// DeletePrefix removes every key starting with prefix.
func (c *Cache) DeletePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.items {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.items, k)
		}
	}
	c.generation++
	c.mu.Unlock()
}

// Len returns the number of stored entries (including expired, until pruned).
func (c *Cache) Len() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}

func (c *Cache) pruneLoop() {
	ticker := time.NewTicker(pruneInterval)
	for range ticker.C {
		c.mu.Lock()
		c.pruneLocked()
		c.mu.Unlock()
	}
}

// pruneLocked must be called with the write lock held.
func (c *Cache) pruneLocked() {
	now := c.nowFunc()
	for k, e := range c.items {
		if now.After(e.expiresAt) {
			delete(c.items, k)
		}
	}
	if len(c.items) > maxEntries {
		// Still over budget after expiry pruning: drop everything. Cheap and
		// safe — the cache is an optimization, not a source of truth.
		c.items = make(map[string]entry, initialCapacity)
	}
}

// GetOrLoadJSON returns a cached value for key, calling load on a miss (or when
// c is nil, which makes wiring optional). Values round-trip through JSON so
// callers never share mutable state across requests. Errors are not cached.
func GetOrLoadJSON[T any](c *Cache, key string, ttl time.Duration, load func() (T, error)) (T, error) {
	var zero T
	if c == nil {
		return load()
	}
	if raw, ok := c.Get(key); ok {
		var v T
		if err := json.Unmarshal(raw, &v); err == nil {
			return v, nil
		}
		// Corrupt entry — treat as a miss and reload.
		c.Delete(key)
	}

	c.mu.Lock()
	// Recheck after acquiring the lock: another caller may have populated the
	// cache between the first lookup and this point.
	if e, ok := c.items[key]; ok {
		if c.nowFunc().Before(e.expiresAt) {
			raw := append([]byte(nil), e.value...)
			c.mu.Unlock()
			var v T
			if err := json.Unmarshal(raw, &v); err == nil {
				return v, nil
			}
			c.Delete(key)
			return GetOrLoadJSON(c, key, ttl, load)
		}
		delete(c.items, key)
	}
	if pending := c.loads[key]; pending != nil {
		c.mu.Unlock()
		<-pending.done
		if pending.err != nil {
			return zero, pending.err
		}
		if len(pending.raw) == 0 {
			// Values that cannot be JSON-encoded retain the previous behavior:
			// they are returned to the loader but are not shared or cached.
			return load()
		}
		var v T
		if err := json.Unmarshal(pending.raw, &v); err != nil {
			return zero, err
		}
		return v, nil
	}
	pending := &loadCall{done: make(chan struct{})}
	c.loads[key] = pending
	startGeneration := c.generation
	c.mu.Unlock()

	v, err := load()
	var raw []byte
	if err == nil {
		if encoded, marshalErr := json.Marshal(v); marshalErr == nil {
			raw = encoded
		}
	}

	c.mu.Lock()
	pending.raw = raw
	pending.err = err
	delete(c.loads, key)
	if err == nil && len(raw) > 0 && c.generation == startGeneration {
		c.setLocked(key, raw, ttl)
	}
	close(pending.done)
	c.mu.Unlock()

	if err != nil {
		return zero, err
	}
	return v, nil
}
