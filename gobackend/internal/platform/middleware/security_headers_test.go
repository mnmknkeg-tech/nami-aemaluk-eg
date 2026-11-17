package middleware

import "testing"

func TestHasAuthCookieDetectsLegacyAndScopedCookies(t *testing.T) {
	cases := []struct {
		name string
		header string
		want bool
	}{
		{name: "empty", header: "", want: false},
		{name: "unrelated", header: "theme=dark; locale=ar", want: false},
		{name: "legacy access", header: "ray_access=token", want: true},
		{name: "legacy refresh", header: "ray_session=token", want: true},
		{name: "scoped access", header: "ray_access-MARKETPLACE=token", want: true},
		{name: "scoped refresh", header: "ray_session-DASHBOARD=token", want: true},
		{name: "scoped with other cookies", header: "theme=dark; ray_access-BUSINESS=token; locale=ar", want: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := hasAuthCookie(tc.header); got != tc.want {
				t.Fatalf("hasAuthCookie(%q) = %v, want %v", tc.header, got, tc.want)
			}
		})
	}
}
