package pagination

import "testing"

func TestNewMeta(t *testing.T) {
	t.Run("first page with more", func(t *testing.T) {
		m := NewMeta(50, 1, 20)
		if m.Total != 50 || m.Page != 1 || m.Limit != 20 {
			t.Fatalf("unexpected meta: %+v", m)
		}
		if !m.HasMore {
			t.Fatalf("expected hasMore=true for page 1 of 50 with limit 20, got %+v", m)
		}
	})

	t.Run("last page no more", func(t *testing.T) {
		m := NewMeta(50, 3, 20)
		if m.HasMore {
			t.Fatalf("expected hasMore=false for page 3 (60>=50), got %+v", m)
		}
	})

	t.Run("exact page boundary", func(t *testing.T) {
		m := NewMeta(40, 2, 20)
		if m.HasMore {
			t.Fatalf("expected hasMore=false when offset exactly consumes total, got %+v", m)
		}
	})

	t.Run("empty data", func(t *testing.T) {
		m := NewMeta(0, 1, 20)
		if m.Total != 0 || m.HasMore {
			t.Fatalf("expected empty meta, got %+v", m)
		}
	})

	t.Run("clamps invalid page/limit", func(t *testing.T) {
		m := NewMeta(10, 0, 0)
		if m.Page != 1 || m.Limit != 20 {
			t.Fatalf("expected page=1 limit=20, got %+v", m)
		}
	})
}