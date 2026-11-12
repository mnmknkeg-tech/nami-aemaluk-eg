package auth

import "testing"

func TestNormalizeEgyptianPhone(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"01012345678", "+201012345678", false},
		{"+201012345678", "+201012345678", false},
		{"00201012345678", "+201012345678", false},
		{"201012345678", "+201012345678", false},
		{"+2 010 1234 5678", "+201012345678", false},
		{"+20.10.1234.5678", "+201012345678", false},
		{"1012345678", "+201012345678", false},
		{"٠١٠١٢٣٤٥٦٧٨", "+201012345678", false},
		{"+20 ۱۱ 1234 5678", "+201112345678", false},
		{"  01512345678 ", "+201512345678", false},
		{"01112345678", "+201112345678", false},
		{"01212345678", "+201212345678", false},
		// Landlines / garbage / wrong prefixes must be rejected.
		{"0223334444", "", true},
		{"0233334444", "", true},
		{"0101234567", "", true},   // 10 digits — too short
		{"010123456789", "", true}, // 12 digits — too long
		{"01812345678", "", true},  // 018 is not a mobile network
		{"01912345678", "", true},  // 019 is not a mobile network
		{"", "", true},
		{"hello", "", true},
		{"+97312345678", "", true}, // Bahrain — not Egyptian
	}

	for _, tc := range cases {
		got, err := NormalizeEgyptianPhone(tc.in)
		if tc.wantErr {
			if err == nil {
				t.Errorf("NormalizeEgyptianPhone(%q) = %q, want error", tc.in, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("NormalizeEgyptianPhone(%q) returned error %v, want %q", tc.in, err, tc.want)
			continue
		}
		if got != tc.want {
			t.Errorf("NormalizeEgyptianPhone(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestSyntheticEmailRoundTrip(t *testing.T) {
	e164 := "+201012345678"
	email := SyntheticEmailForPhone(e164)
	if email != "201012345678@phone.mnmknk.eg" {
		t.Fatalf("SyntheticEmailForPhone(%q) = %q", e164, email)
	}
	if !IsSyntheticEmail(email) {
		t.Error("IsSyntheticEmail should flag the placeholder domain")
	}
	if IsSyntheticEmail("real.user@gmail.com") {
		t.Error("IsSyntheticEmail should not flag real mailboxes")
	}
}
