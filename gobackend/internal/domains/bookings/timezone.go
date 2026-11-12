package bookings

import (
	"fmt"
	"sync"
	"time"
)

// All customer-facing booking times are Egypt wall-clock times. Slots, work
// hours (bookingWorkStart/bookingWorkEnd) and date filters are interpreted in
// Cairo local time — never UTC — so a 21:00 closing time means 21:00 in Cairo.
var (
	cairoOnce sync.Once
	cairoLoc  *time.Location
)

// CairoLocation returns the Africa/Cairo location, falling back to a fixed
// +02:00 zone only if tzdata is unavailable in the runtime image. The binary
// embeds tzdata via `import _ "time/tzdata"` in cmd/api and cmd/worker, so the
// fallback is a last resort, not the normal path.
func CairoLocation() *time.Location {
	cairoOnce.Do(func() {
		loc, err := time.LoadLocation("Africa/Cairo")
		if err != nil {
			loc = time.FixedZone("Cairo", 2*3600)
		}
		cairoLoc = loc
	})
	return cairoLoc
}

// CairoDayStart returns midnight (00:00 Cairo) of the given Y-M-D date string
// ("2006-01-02"). The returned instant carries the Cairo offset, so storing it
// as timestamptz keeps the wall-clock meaning stable.
func CairoDayStart(dateStr string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", dateStr, CairoLocation())
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date %q: %w", dateStr, err)
	}
	return t, nil
}

// CairoWallClock combines a Y-M-D date and an "HH:MM" wall-clock time into an
// absolute instant expressed in Cairo local time.
func CairoWallClock(dateStr, clockStr string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02 15:04", dateStr+" "+clockStr, CairoLocation())
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date/time %q %q: %w", dateStr, clockStr, err)
	}
	return t, nil
}

// FormatCairoClock renders an instant as Cairo "HH:MM".
func FormatCairoClock(t time.Time) string {
	return t.In(CairoLocation()).Format("15:04")
}

// FormatCairoDate renders an instant as Cairo "2006-01-02".
func FormatCairoDate(t time.Time) string {
	return t.In(CairoLocation()).Format("2006-01-02")
}
