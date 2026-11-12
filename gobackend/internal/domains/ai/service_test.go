package ai

import "testing"

func TestTrendOf(t *testing.T) {
	cases := []struct {
		cur, prev float64
		want      string
	}{
		{100, 50, "up"},
		{50, 100, "down"},
		{100, 100, "stable"},
		{0, 0, "stable"},
		{100, 0, "up"},
		{0, 100, "down"},
		{104, 100, "stable"}, // within 5% band
		{106, 100, "up"},
		{96, 100, "stable"}, // -4% within band
		{94, 100, "down"},   // -6% outside band
	}
	for _, c := range cases {
		if got := trendOf(c.cur, c.prev); got != c.want {
			t.Errorf("trendOf(%v,%v) = %q, want %q", c.cur, c.prev, got, c.want)
		}
	}
}

func TestTrendPct(t *testing.T) {
	if got := trendPct(150, 100); got != 50 {
		t.Errorf("trendPct(150,100) = %v, want 50", got)
	}
	if got := trendPct(100, 0); got != 100 {
		t.Errorf("trendPct(100,0) = %v, want 100", got)
	}
	if got := trendPct(0, 0); got != 0 {
		t.Errorf("trendPct(0,0) = %v, want 0", got)
	}
}

func TestSeoStatus(t *testing.T) {
	cases := map[float64]string{
		100: "optimized", 80: "optimized", 79.9: "needs_improvement",
		50: "needs_improvement", 49.9: "critical", 0: "critical",
	}
	for score, want := range cases {
		if got := seoStatus(score); got != want {
			t.Errorf("seoStatus(%v) = %q, want %q", score, got, want)
		}
	}
}

func TestEgp(t *testing.T) {
	if got := egp(1500); got != "1.5 ألف ج.م" {
		t.Errorf("egp(1500) = %q", got)
	}
	if got := egp(2500000); got != "2.5M ج.م" {
		t.Errorf("egp(2500000) = %q", got)
	}
	if got := egp(250); got != "250 ج.م" {
		t.Errorf("egp(250) = %q", got)
	}
}

func TestJoinArabic(t *testing.T) {
	got := joinArabic([]string{"3 منتجات بدون وصف", "2 منتج بدون صورة"})
	want := "3 منتجات بدون وصف و2 منتج بدون صورة"
	if got != want {
		t.Errorf("joinArabic = %q, want %q", got, want)
	}
}
