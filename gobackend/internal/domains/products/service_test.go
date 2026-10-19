package products

import "testing"

func TestNormalizePaging(t *testing.T) {
	t.Run("nominal", func(t *testing.T) {
		page, limit, offset := normalizePaging(2, 20)
		if page != 2 || limit != 20 || offset != 20 {
			t.Fatalf("got page=%d limit=%d offset=%d", page, limit, offset)
		}
	})

	t.Run("clamps limit and page", func(t *testing.T) {
		page, limit, offset := normalizePaging(0, 500)
		if page != 1 || limit != 200 || offset != 0 {
			t.Fatalf("got page=%d limit=%d offset=%d", page, limit, offset)
		}
	})

	t.Run("negative limit defaults", func(t *testing.T) {
		page, limit, _ := normalizePaging(1, -5)
		if page != 1 || limit != 20 {
			t.Fatalf("got page=%d limit=%d", page, limit)
		}
	})

	t.Run("offset consistency", func(t *testing.T) {
		_, _, offset := normalizePaging(5, 25)
		if offset != 100 {
			t.Fatalf("got offset=%d want 100", offset)
		}
	})
}