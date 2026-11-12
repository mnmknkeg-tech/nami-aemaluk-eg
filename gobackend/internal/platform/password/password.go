package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

const (
	MinLength = 8
	MaxLength = 128

	// Argon2id parameters (OWASP-recommended as of 2023).
	// time=1, memory=64MB, threads=1, keyLen=32.
	argonTime    = 1
	argonMemory  = 64 * 1024 // 64 MB
	argonThreads = 1
	argonKeyLen  = 32
	argonSaltLen = 16
)

// Validate returns a domain validation error when the password does not meet
// the minimum policy requirements.
func Validate(password string) error {
	if len(password) < MinLength {
		return fmt.Errorf("password_too_short: كلمة المرور يجب أن تكون 8 أحرف على الأقل")
	}
	if len(password) > MaxLength {
		return fmt.Errorf("password_too_long: كلمة المرور أطول من المسموح")
	}

	hasUpper, hasLower, hasDigit, hasSpecial := false, false, false, false
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			hasSpecial = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit {
		return fmt.Errorf("password_complexity: كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام")
	}
	if !hasSpecial {
		return fmt.Errorf("password_complexity: كلمة المرور يجب أن تحتوي على رمز خاص على الأقل")
	}

	return nil
}

// Hash generates an Argon2id hash of the password with a random salt.
// The returned string is in the format: argon2id$<hash>
func Hash(password string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)

	// Encode as: argon2id$<base64(salt)>$<base64(hash)>
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)
	return fmt.Sprintf("argon2id$%s$%s", b64Salt, b64Hash), nil
}

// Verify checks a password against a stored Argon2id hash.
// It uses constant-time comparison to prevent timing attacks.
func Verify(password, encoded string) (bool, error) {
	if strings.HasPrefix(encoded, "$2a$") || strings.HasPrefix(encoded, "$2b$") {
		// Legacy bcrypt support
		err := bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password))
		return err == nil, nil
	}

	if !strings.HasPrefix(encoded, "argon2id$") {
		return false, fmt.Errorf("unsupported hash format")
	}

	parts := strings.Split(encoded, "$")
	if len(parts) != 3 {
		return false, fmt.Errorf("malformed hash")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return false, fmt.Errorf("failed to decode salt: %w", err)
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return false, fmt.Errorf("failed to decode hash: %w", err)
	}

	computedHash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)

	// Constant-time comparison to prevent timing attacks.
	if subtle.ConstantTimeCompare(expectedHash, computedHash) == 1 {
		return true, nil
	}
	return false, nil
}
