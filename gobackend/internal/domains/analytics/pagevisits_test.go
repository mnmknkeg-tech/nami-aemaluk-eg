package analytics

import (
	"testing"
	"time"
)

func TestDetectDeviceType(t *testing.T) {
	cases := []struct {
		name     string
		client   string
		agent    string
		expected string
	}{
		{"iphone is mobile", "", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", DeviceMobile},
		{"android phone is mobile", "", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit Mobile Safari", DeviceMobile},
		{"ipad is tablet", "", "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit Safari", DeviceTablet},
		{"android tablet is tablet", "", "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit Safari", DeviceTablet},
		{"windows desktop is desktop", "", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit Chrome/120 Safari", DeviceDesktop},
		{"missing agent falls back to client hint", DeviceMobile, "", DeviceMobile},
		{"missing agent and hint defaults to desktop", "", "", DeviceDesktop},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := detectDeviceType(tc.client, tc.agent); got != tc.expected {
				t.Fatalf("detectDeviceType(%q, %q) = %q, want %q", tc.client, tc.agent, got, tc.expected)
			}
		})
	}
}

func TestNormalizeIP(t *testing.T) {
	cases := map[string]string{
		"203.0.113.7":                  "203.0.113.7",
		" 203.0.113.7 ":                "203.0.113.7",
		"203.0.113.7, 70.41.3.18":      "203.0.113.7",
		"2001:db8::1":                  "2001:db8::1",
		"not-an-ip":                    "",
		"":                             "",
		"::ffff:192.0.2.128":           "192.0.2.128",
		"garbage, 198.51.100.4, junk":  "198.51.100.4",
	}

	for input, expected := range cases {
		if got := normalizeIP(input); got != expected {
			t.Errorf("normalizeIP(%q) = %q, want %q", input, got, expected)
		}
	}
}

func TestNormalizeUUID(t *testing.T) {
	valid := "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
	if got := normalizeUUID(" " + valid + " "); got != valid {
		t.Fatalf("normalizeUUID kept valid uuid: got %q", got)
	}
	for _, invalid := range []string{"", "shop-1", "12345", "3f2504e04f8911d39a0c0305e82c3301"} {
		if got := normalizeUUID(invalid); got != "" {
			t.Errorf("normalizeUUID(%q) = %q, want empty", invalid, got)
		}
	}
}

func TestVisitorFingerprint(t *testing.T) {
	first := visitorFingerprint("203.0.113.7", "Mozilla/5.0")
	if first == "" {
		t.Fatal("expected a fingerprint for ip+agent")
	}
	if first != visitorFingerprint("203.0.113.7", "Mozilla/5.0") {
		t.Fatal("fingerprint must be stable for the same ip+agent")
	}
	if first == visitorFingerprint("203.0.113.8", "Mozilla/5.0") {
		t.Fatal("fingerprint must differ across ips")
	}
	if got := visitorFingerprint("", ""); got != "" {
		t.Fatalf("expected empty fingerprint, got %q", got)
	}
}

func TestNormalizePageVisitFilter(t *testing.T) {
	got := normalizePageVisitFilter(PageVisitFilter{DeviceType: "spaceship", Days: 0, Limit: 9999, Offset: -5})
	if got.DeviceType != "" {
		t.Errorf("unknown device type must be dropped, got %q", got.DeviceType)
	}
	if got.Days != 7 {
		t.Errorf("days default = %d, want 7", got.Days)
	}
	if got.Limit != 200 {
		t.Errorf("limit clamp = %d, want 200", got.Limit)
	}
	if got.Offset != 0 {
		t.Errorf("offset clamp = %d, want 0", got.Offset)
	}

	if got := normalizePageVisitFilter(PageVisitFilter{DeviceType: DeviceMobile, Days: 500, Limit: 25}); got.Days != 365 || got.Limit != 25 {
		t.Errorf("days/limit clamps wrong: %+v", got)
	}
}

func TestPageVisitFilterWhere(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	where, args := PageVisitFilter{Days: 7, Limit: 50}.where(start)
	if where != " WHERE created_at >= $1" || len(args) != 1 {
		t.Fatalf("unfiltered where = %q args=%v", where, args)
	}

	where, args = PageVisitFilter{DeviceType: DeviceTablet, Path: "/offers", Days: 7}.where(start)
	if where != " WHERE created_at >= $1 AND device_type = $2 AND path ILIKE $3" {
		t.Fatalf("filtered where = %q", where)
	}
	if len(args) != 3 || args[1] != DeviceTablet || args[2] != "%/offers%" {
		t.Fatalf("filtered args = %v", args)
	}
}

func TestDeviceLabel(t *testing.T) {
	if got := deviceLabel(DeviceMobile); got != "موبايل" {
		t.Errorf("mobile label = %q", got)
	}
	if got := deviceLabel(DeviceTablet); got != "تابلت" {
		t.Errorf("tablet label = %q", got)
	}
	if got := deviceLabel(DeviceDesktop); got != "كمبيوتر" {
		t.Errorf("desktop label = %q", got)
	}
}

func TestTruncate(t *testing.T) {
	if got := truncate("abcdef", 3); got != "abc" {
		t.Errorf("truncate = %q", got)
	}
	if got := truncate("abc", 10); got != "abc" {
		t.Errorf("truncate short = %q", got)
	}
	if got := truncate("abc", 0); got != "abc" {
		t.Errorf("truncate with zero max = %q", got)
	}
}