package auth

import (
	"fmt"
	"strings"
)

// egyptCountryCode is the dialing prefix every marketplace account phone is
// stored with. Egypt is a mobile-first market — the marketplace always shows
// and stores numbers in E.164 (+201XXXXXXXXX) so login, orders and delivery
// all share one canonical value.
const egyptCountryCode = "+20"

// syntheticEmailDomain is the mailbox placeholder domain for phone-first
// accounts that never provided an email. The users.email column is NOT NULL
// and unique, so phone signups get a deterministic placeholder instead.
const syntheticEmailDomain = "phone.mnmknk.eg"

// normalizeDigits converts Arabic-Indic (٠-٩) and Eastern-Arabic (۰-۹) digits
// to ASCII digits — Egyptian users type both depending on keyboard.
func normalizeDigits(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= '\u0660' && r <= '\u0669': // ٠-٩
			b.WriteRune('0' + (r - '\u0660'))
		case r >= '\u06F0' && r <= '\u06F9': // ۰-۹
			b.WriteRune('0' + (r - '\u06F0'))
		}
	}
	return b.String()
}

// NormalizeEgyptianPhone turns any reasonable Egyptian mobile input —
// "01012345678", "+20 10 1234 5678", "00201012345678", "+2 010…", Arabic
// digits, stray separators — into the canonical E.164 form "+201XXXXXXXXX".
// Only real mobiles are accepted (network 10/11/12/15): the phone is the login
// identity, and landlines can never receive a login.
func NormalizeEgyptianPhone(raw string) (string, error) {
	const invalidMsg = "رقم موبايل مصري غير صحيح — اكتب الرقم زي ما هو، مثال: 01012345678"

	digits := normalizeDigits(raw)
	// Strip every separator users sprinkle in (spaces, dashes, dots, parens)
	// and any leading country dial-out tokens.
	digits = strings.Map(func(r rune) rune {
		if (r >= '0' && r <= '9') || r == '+' {
			return r
		}
		return -1
	}, digits)
	digits = strings.TrimPrefix(digits, "+")
	digits = strings.TrimPrefix(digits, "00")
	digits = strings.TrimPrefix(digits, "20")
	// Local Egyptian form: drop the leading trunk 0 ("010…" → "10…").
	digits = strings.TrimPrefix(digits, "0")

	if !strings.HasPrefix(digits, "1") {
		return "", fmt.Errorf("%s", invalidMsg)
	}
	// Mobile subscriber numbers are exactly 10 digits: 1 + [0,1,2,5] + 8 more.
	if len(digits) != 10 || !strings.ContainsAny(digits[1:2], "0125") {
		return "", fmt.Errorf("%s", invalidMsg)
	}
	return egyptCountryCode + digits, nil
}

// SyntheticEmailForPhone derives the deterministic placeholder email for a
// phone-first account: "+201012345678" → "201012345678@phone.mnmknk.eg".
// It satisfies the NOT NULL + unique users.email schema without pretending the
// user has a real mailbox.
func SyntheticEmailForPhone(e164 string) string {
	return strings.TrimPrefix(e164, "+") + "@" + syntheticEmailDomain
}

// IsSyntheticEmail reports whether the email is a phone-account placeholder —
// verification/reset mail must never be sent to it.
func IsSyntheticEmail(email string) bool {
	return strings.HasSuffix(email, "@"+syntheticEmailDomain)
}
