package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenClaims is the common JWT claim set used for access and refresh tokens.
type TokenClaims struct {
	jwt.RegisteredClaims
	Email  string `json:"email,omitempty"`
	Role   string `json:"role,omitempty"`
	ShopID string `json:"shopId,omitempty"`
	Type   string `json:"typ,omitempty"`
}

// TokenService issues and validates JWTs.
type TokenService struct {
	secret             []byte
	issuer             string
	audience           []string
	accessTokenExpiry  time.Duration
	refreshTokenExpiry time.Duration
}

// NewTokenService creates a token service from configuration.
func NewTokenService(secret string, accessExpiry, refreshExpiry time.Duration) (*TokenService, error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT secret must be at least 32 characters")
	}
	return &TokenService{
		secret:             []byte(secret),
		issuer:             "ray-backend-go",
		audience:           []string{"ray-platform"},
		accessTokenExpiry:  accessExpiry,
		refreshTokenExpiry: refreshExpiry,
	}, nil
}

// NewTokenServiceWithAudience creates a token service with a custom issuer and audience.
func NewTokenServiceWithAudience(secret string, accessExpiry, refreshExpiry time.Duration, issuer string, audience []string) (*TokenService, error) {
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT secret must be at least 32 characters")
	}
	if issuer == "" {
		issuer = "ray-backend-go"
	}
	if len(audience) == 0 {
		audience = []string{"ray-platform"}
	}
	return &TokenService{
		secret:             []byte(secret),
		issuer:             issuer,
		audience:           audience,
		accessTokenExpiry:  accessExpiry,
		refreshTokenExpiry: refreshExpiry,
	}, nil
}

// IssueAccessToken creates a short-lived access token for a user.
// The sessionID is embedded as the JWT ID (jti) claim for server-side
// session validation and revocation.
func (s *TokenService) IssueAccessToken(user User, sessionID string) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  s.audience,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTokenExpiry)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        sessionID,
		},
		Email:  user.Email,
		Role:   string(user.Role),
		ShopID: strPtrValue(user.ShopID),
		Type:   "access",
	}
	return s.sign(claims)
}

// IssueRefreshToken creates a long-lived refresh token.
// The sessionID is embedded as the JWT ID (jti) claim so the server can
// validate the session is still active and perform rotation.
func (s *TokenService) IssueRefreshToken(user User, sessionID string) (string, error) {
	return s.IssueRefreshTokenAt(user, sessionID, time.Now())
}

// IssueRefreshTokenAt signs a refresh token whose iat/exp are pinned to iat
// instead of "now". Rotation and grace re-issue tokens with the session's
// IssuedAt, which makes the signature byte-identical every time: a grace
// refresh can therefore return the exact same refresh token the rotated
// response carried, without ever storing the plaintext server-side.
func (s *TokenService) IssueRefreshTokenAt(user User, sessionID string, iat time.Time) (string, error) {
	if iat.IsZero() {
		iat = time.Now()
	}
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  s.audience,
			IssuedAt:  jwt.NewNumericDate(iat),
			ExpiresAt: jwt.NewNumericDate(iat.Add(s.refreshTokenExpiry)),
			NotBefore: jwt.NewNumericDate(iat),
			ID:        sessionID,
		},
		Email: user.Email,
		Type:  "refresh",
	}
	return s.sign(claims)
}

// IssuePasswordResetToken creates a one-time password reset token.
func (s *TokenService) IssuePasswordResetToken(user User) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  s.audience,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.Must(uuid.NewV7()).String(),
		},
		Email: user.Email,
		Type:  "password_reset",
	}
	return s.sign(claims)
}

// Issue2FAChallengeToken creates a short-lived one-time token that gates the
// second factor during login. It is handed back to the client after the
// password check succeeds on a 2FA-enabled account; the client exchanges it,
// together with a valid TOTP code, for a real token pair via Login2FA. It
// cannot authenticate API requests (RequireAuth only accepts typ=access or
// typ=refresh) and expires in five minutes.
func (s *TokenService) Issue2FAChallengeToken(user User) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  s.audience,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.Must(uuid.NewV7()).String(),
		},
		Email: user.Email,
		Type:  "2fa_challenge",
	}
	return s.sign(claims)
}

// IssueEmailVerificationToken creates an email verification token.
func (s *TokenService) IssueEmailVerificationToken(user User) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  s.audience,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.Must(uuid.NewV7()).String(),
		},
		Email: user.Email,
		Type:  "email_verification",
	}
	return s.sign(claims)
}

// Parse validates a token string and returns the embedded claims.
// It enforces issuer and audience validation.
func (s *TokenService) Parse(token string) (*TokenClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &TokenClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.issuer),
		jwt.WithAudience(s.audience[0]),
	)
	if err != nil {
		return nil, err
	}
	if !parsed.Valid {
		return nil, fmt.Errorf("token is not valid")
	}
	claims, ok := parsed.Claims.(*TokenClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}

func (s *TokenService) sign(claims TokenClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func strPtrValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
