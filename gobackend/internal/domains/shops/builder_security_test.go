package shops

import "testing"

func TestDraftVersionMatchesRequiresExactVersion(t *testing.T) {
	tests := []struct {
		name          string
		serverVersion int64
		clientVersion int64
		want          bool
	}{
		{name: "initial empty draft", serverVersion: 0, clientVersion: 0, want: true},
		{name: "matching current draft", serverVersion: 8, clientVersion: 8, want: true},
		{name: "stale browser session", serverVersion: 8, clientVersion: 7, want: false},
		{name: "missing token cannot bypass protection", serverVersion: 8, clientVersion: 0, want: false},
		{name: "future token is rejected", serverVersion: 8, clientVersion: 9, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := draftVersionMatches(test.serverVersion, test.clientVersion); got != test.want {
				t.Fatalf("draftVersionMatches(%d, %d) = %v, want %v", test.serverVersion, test.clientVersion, got, test.want)
			}
		})
	}
}
