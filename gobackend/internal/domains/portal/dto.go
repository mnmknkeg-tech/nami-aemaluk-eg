package portal

import "time"

// Owner represents a map listing owner.
type Owner struct {
	ID           string     `json:"id"`
	Phone        *string    `json:"phone,omitempty"`
	Email        *string    `json:"email,omitempty"`
	Name         *string    `json:"name,omitempty"`
	PasswordHash *string    `json:"-"`
	AvatarURL    *string    `json:"avatarUrl,omitempty"`
	IsActive     bool       `json:"isActive"`
	LastLogin    *time.Time `json:"lastLogin,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

// OtpCode represents an OTP code.
type OtpCode struct {
	ID        string    `json:"id"`
	Phone     string    `json:"phone"`
	CodeHash  string    `json:"-"`
	Purpose   string    `json:"purpose"`
	Verified  bool      `json:"verified"`
	Attempts  int       `json:"attempts"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
}

// RegisterRequest is the payload for registration.
type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name,omitempty"`
	Phone    string `json:"phone,omitempty"`
}

// LoginRequest is defined in service.go to allow email or phone login.

// ChangePasswordRequest is the payload for changing password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// RequestOtpRequest is the payload for requesting OTP.
type RequestOtpRequest struct {
	Phone   string `json:"phone" validate:"required"`
	Purpose string `json:"purpose,omitempty"`
}

// VerifyOtpRequest is the payload for verifying OTP.
type VerifyOtpRequest struct {
	Phone   string `json:"phone" validate:"required"`
	Code    string `json:"code" validate:"required,len=6"`
	Purpose string `json:"purpose,omitempty"`
}

// AuthResponse is the authentication response.
type AuthResponse struct {
	OK          bool    `json:"ok"`
	AccessToken string  `json:"access_token,omitempty"`
	Owner       *Owner  `json:"owner,omitempty"`
	DevCode     *string `json:"devCode,omitempty"`
}

// OwnerResponse is the serialized owner response.
type OwnerResponse struct {
	ID        string `json:"id"`
	Phone     string `json:"phone,omitempty"`
	Name      string `json:"name,omitempty"`
	Email     string `json:"email,omitempty"`
	AvatarURL string `json:"avatarUrl,omitempty"`
}
