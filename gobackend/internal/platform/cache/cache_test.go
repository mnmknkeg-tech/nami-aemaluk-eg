package cache

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestSetGetExpiry(t *testing.T) {
	c := New()
	defer c.Close()
	defer c.Close()

	c.Set("k", []byte("v"), 50*time.Millisecond)
	if _, ok := c.Get("k"); !ok {
		t.Fatal("expected fresh entry to hit")
	}
	time.Sleep(60 * time.Millisecond)
	if _, ok := c.Get("k"); ok {
		t.Fatal("expected expired entry to miss")
	}
}

func TestDeleteAndPrefix(t *testing.T) {
	c := New()
	defer c.Close()
	c.Set("offers:public:1", []byte("a"), time.Minute)
	c.Set("offers:public:2", []byte("b"), time.Minute)
	c.Set("shops:public:1", []byte("c"), time.Minute)

	c.DeletePrefix("offers:public:")
	if _, ok := c.Get("offers:public:1"); ok {
		t.Fatal("offers key should be invalidated")
	}
	if _, ok := c.Get("shops:public:1"); !ok {
		t.Fatal("shops key should survive")
	}
	c.Delete("shops:public:1")
	if _, ok := c.Get("shops:public:1"); ok {
		t.Fatal("deleted key should miss")
	}
}

func TestGetOrLoadJSON(t *testing.T) {
	c := New()
	defer c.Close()
	calls := 0
	load := func() (map[string]int, error) {
		calls++
		return map[string]int{"n": calls}, nil
	}

	v1, err := GetOrLoadJSON(c, "x", time.Minute, load)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v1["n"] != 1 {
		t.Fatalf("first load should return 1, got %v", v1)
	}
	v2, err := GetOrLoadJSON(c, "x", time.Minute, load)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v2["n"] != 1 {
		t.Fatalf("second call should be served from cache, got %v", v2)
	}
	if calls != 1 {
		t.Fatalf("load should be called once, called %d times", calls)
	}

	// nil cache must degrade to direct load.
	v3, err := GetOrLoadJSON(nil, "y", time.Minute, load)
	if err != nil || v3["n"] != 2 {
		t.Fatalf("nil cache should load directly, got %v err %v", v3, err)
	}
}

func TestConcurrentAccess(t *testing.T) {
	c := New()
	defer c.Close()
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a' + i%8))
			c.Set(key, []byte("v"), time.Minute)
			_, _ = c.Get(key)
			c.Delete(key)
		}(i)
	}
	wg.Wait()
}


func TestSetGetCopiesByteSlices(t *testing.T) {
	c := New()
	defer c.Close()
	input := []byte("original")
	c.Set("copy", input, time.Minute)
	input[0] = 'X'

	got, ok := c.Get("copy")
	if !ok || string(got) != "original" {
		t.Fatalf("cache must copy input bytes, got %q (ok=%v)", got, ok)
	}
	got[0] = 'Y'
	again, ok := c.Get("copy")
	if !ok || string(again) != "original" {
		t.Fatalf("mutating a returned value must not mutate cache, got %q (ok=%v)", again, ok)
	}
}

func TestGetOrLoadJSONSingleFlight(t *testing.T) {
	c := New()
	defer c.Close()
	const workers = 16
	var calls atomic.Int32
	started := make(chan struct{}, 1)
	release := make(chan struct{})
	var wg sync.WaitGroup
	start := make(chan struct{})

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			value, err := GetOrLoadJSON(c, "shared", time.Minute, func() (map[string]int, error) {
				if calls.Add(1) == 1 {
					started <- struct{}{}
				}
				<-release
				return map[string]int{"value": 42}, nil
			})
			if err != nil || value["value"] != 42 {
				t.Errorf("unexpected singleflight result: value=%v err=%v", value, err)
			}
		}()
	}
	close(start)
	<-started
	time.Sleep(20 * time.Millisecond)
	close(release)
	wg.Wait()
	if got := calls.Load(); got != 1 {
		t.Fatalf("expected one load for concurrent misses, got %d", got)
	}
}

func TestGetOrLoadJSONDoesNotCacheAcrossInvalidation(t *testing.T) {
	c := New()
	defer c.Close()
	started := make(chan struct{}, 1)
	release := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_, _ = GetOrLoadJSON(c, "shops:public:1", time.Minute, func() (map[string]int, error) {
			started <- struct{}{}
			<-release
			return map[string]int{"value": 1}, nil
		})
	}()
	<-started
	c.DeletePrefix("shops:public:")
	close(release)
	wg.Wait()
	if c.Len() != 0 {
		t.Fatalf("in-flight stale load must not repopulate invalidated cache, len=%d", c.Len())
	}

func TestCloseStopsPrunerAndIsIdempotent(t *testing.T) {
	c := New()
	c.Close()
	select {
	case <-c.done:
	case <-time.After(time.Second):
		t.Fatal("cache pruner did not stop after Close")
	}
	c.Close()
}

func TestPruneEvictsOldestEntriesWithoutFlushingCache(t *testing.T) {
	c := New()
	defer c.Close()

	now := time.Now()
	c.mu.Lock()
	for i := 0; i < maxEntries+2; i++ {
		key := fmt.Sprintf("entry:%d", i)
		c.items[key] = entry{
			value:     []byte(key),
			expiresAt: now.Add(time.Duration(i+1) * time.Second),
		}
	}
	c.pruneLocked()
	c.mu.Unlock()

	if got := c.Len(); got != maxEntries {
		t.Fatalf("expected cache to retain %d entries, got %d", maxEntries, got)
	}
	if _, ok := c.Get("entry:0"); ok {
		t.Fatal("oldest entry should be evicted first")
	}
	if _, ok := c.Get("entry:1"); ok {
		t.Fatal("second-oldest entry should be evicted")
	}
	if _, ok := c.Get(fmt.Sprintf("entry:%d", maxEntries+1)); !ok {
		t.Fatal("newest entry should remain cached")
	}
}
}
