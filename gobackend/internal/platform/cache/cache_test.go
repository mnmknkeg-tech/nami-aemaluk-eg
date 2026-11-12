package cache

import (
	"sync"
	"testing"
	"time"
)

func TestSetGetExpiry(t *testing.T) {
	c := New()
	defer func() { _ = c }()

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
