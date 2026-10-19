package portal

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the Portal domain business logic.
type Service struct {
	repo       *Repository
	jwtSecret  string
	disableOtp bool
	isDev      bool
}

// NewService creates a new portal service.
func NewService(repo *Repository, jwtSecret string, disableOtp bool, isDev bool) *Service {
	return &Service{repo: repo, jwtSecret: jwtSecret, disableOtp: disableOtp, isDev: isDev}
}

// RegisterWithPassword registers a new owner with email and password.
func (s *Service) RegisterWithPassword(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	email := normalizeEmail(req.Email)
	if email == "" {
		return nil, errors.Validation("email_required", "البريد الإلكتروني مطلوب")
	}
	if len(req.Password) < 8 {
		return nil, errors.Validation("password_too_short", "كلمة المرور يجب ألا تقل عن 8 أحرف")
	}

	existing, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.Validation("email_exists", "البريد مستخدم بالفعل")
	}

	phone := normalizePhone(req.Phone)
	if phone != "" {
		existingPhone, err := s.repo.FindByPhone(ctx, phone)
		if err != nil {
			return nil, err
		}
		if existingPhone != nil {
			return nil, errors.Validation("phone_exists", "رقم الموبايل مستخدم بالفعل")
		}
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, errors.Internal("hash_password_failed", err)
	}

	now := time.Now()
	var namePtr, phonePtr *string
	if strings.TrimSpace(req.Name) != "" {
		n := strings.TrimSpace(req.Name)
		namePtr = &n
	}
	if phone != "" {
		phonePtr = &phone
	}

	owner := &Owner{
		Email:        &email,
		PasswordHash: &passwordHash,
		Name:         namePtr,
		Phone:        phonePtr,
		IsActive:     true,
		LastLogin:    &now,
	}

	created, err := s.repo.Create(ctx, owner)
	if err != nil {
		return nil, err
	}

	token, err := s.issuePortalToken(created.ID, created.Phone)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		OK:          true,
		AccessToken: token,
		Owner:       shapeOwner(*created),
	}, nil
}

// LoginRequest is the payload for password login.
// Either email or phone must be provided.
type LoginRequest struct {
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
	Password string `json:"password" validate:"required"`
}

// LoginWithPassword logs in with email or phone and password.
func (s *Service) LoginWithPassword(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	if req.Password == "" {
		return nil, errors.Validation("password_required", "كلمة المرور مطلوبة")
	}

	email := normalizeEmail(req.Email)
	phone := normalizePhone(req.Phone)
	if email == "" && phone == "" {
		return nil, errors.Validation("email_or_phone_required", "البريد الإلكتروني أو رقم الهاتف مطلوب")
	}

	var owner *Owner
	var err error
	if email != "" {
		owner, err = s.repo.FindByEmail(ctx, email)
	} else {
		owner, err = s.repo.FindByPhone(ctx, phone)
	}
	if err != nil {
		return nil, err
	}
	if owner == nil || !owner.IsActive {
		return nil, errors.Unauthorized("invalid_credentials", "بيانات الدخول غير صحيحة")
	}
	if owner.PasswordHash == nil {
		return nil, errors.Unauthorized("no_password", "الحساب غير مفعّل بكلمة مرور")
	}

	if !CheckPassword(req.Password, *owner.PasswordHash) {
		return nil, errors.Unauthorized("invalid_credentials", "بيانات الدخول غير صحيحة")
	}

	now := time.Now()
	if err := s.repo.UpdateLastLogin(ctx, owner.ID, now); err != nil {
		return nil, err
	}

	token, err := s.issuePortalToken(owner.ID, owner.Phone)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		OK:          true,
		AccessToken: token,
		Owner:       shapeOwner(*owner),
	}, nil
}

// ChangePassword changes the owner's password.
func (s *Service) ChangePassword(ctx context.Context, ownerID string, req ChangePasswordRequest) error {
	owner, err := s.repo.FindByID(ctx, ownerID)
	if err != nil {
		return err
	}
	if owner == nil || !owner.IsActive {
		return errors.Unauthorized("invalid_owner", "بيانات الدخول غير صحيحة")
	}
	if owner.PasswordHash == nil {
		return errors.Validation("no_password", "الحساب ليس لديه كلمة مرور")
	}

	if !CheckPassword(req.CurrentPassword, *owner.PasswordHash) {
		return errors.Unauthorized("invalid_current_password", "كلمة المرور الحالية غير صحيحة")
	}

	if len(req.NewPassword) < 8 {
		return errors.Validation("password_too_short", "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف")
	}

	passwordHash, err := HashPassword(req.NewPassword)
	if err != nil {
		return errors.Internal("hash_password_failed", err)
	}

	return s.repo.UpdatePassword(ctx, ownerID, passwordHash)
}

// RequestOtp requests an OTP code for a phone number.
func (s *Service) RequestOtp(ctx context.Context, req RequestOtpRequest) (*AuthResponse, error) {
	phone := normalizePhone(req.Phone)
	if phone == "" {
		return nil, errors.Validation("phone_required", "رقم الموبايل مطلوب")
	}

	purpose := req.Purpose
	if purpose == "" {
		purpose = "login"
	}

	oneHourAgo := time.Now().Add(-1 * time.Hour)
	count, err := s.repo.CountRecentOtpCodes(ctx, phone, purpose, oneHourAgo)
	if err != nil {
		return nil, err
	}
	if count >= 5 {
		return nil, errors.Validation("too_many_otp", "تم إرسال كود كتير، حاول بعد ساعة")
	}

	if err := s.repo.InvalidatePreviousOtpCodes(ctx, phone, purpose); err != nil {
		return nil, err
	}

	code, err := generateOtpCode()
	if err != nil {
		return nil, errors.Internal("generate_otp_failed", err)
	}

	codeHash, err := HashPassword(code)
	if err != nil {
		return nil, errors.Internal("hash_otp_failed", err)
	}

	expiresAt := time.Now().Add(5 * time.Minute)
	if err := s.repo.CreateOtpCode(ctx, phone, codeHash, purpose, expiresAt); err != nil {
		return nil, err
	}

	resp := &AuthResponse{OK: true}
	if s.isDev {
		resp.DevCode = &code
	}
	return resp, nil
}

// VerifyOtp verifies an OTP code and authenticates the user.
func (s *Service) VerifyOtp(ctx context.Context, req VerifyOtpRequest) (*AuthResponse, error) {
	phone := normalizePhone(req.Phone)
	if phone == "" {
		return nil, errors.Validation("phone_required", "رقم الموبايل مطلوب")
	}

	purpose := req.Purpose
	if purpose == "" {
		purpose = "login"
	}

	if !s.disableOtp && len(req.Code) != 6 {
		return nil, errors.Validation("code_required", "كود التحقق مطلوب")
	}

	now := time.Now()

	if s.disableOtp {
		owner, err := s.repo.UpsertByPhone(ctx, phone, now)
		if err != nil {
			return nil, err
		}
		token, err := s.issuePortalToken(owner.ID, owner.Phone)
		if err != nil {
			return nil, err
		}
		return &AuthResponse{
			OK:          true,
			AccessToken: token,
			Owner:       shapeOwner(*owner),
		}, nil
	}

	otp, err := s.repo.FindLatestValidOtpCode(ctx, phone, purpose)
	if err != nil {
		return nil, err
	}
	if otp == nil {
		return nil, errors.Validation("invalid_otp", "كود التحقق غير صالح أو منتهي")
	}

	if otp.Attempts >= 5 {
		return nil, errors.Validation("otp_attempts_exceeded", "عدد المحاولات خلص، اطلب كود جديد")
	}

	if err := s.repo.IncrementOtpAttempts(ctx, otp.ID); err != nil {
		return nil, err
	}

	if !CheckPassword(req.Code, otp.CodeHash) {
		return nil, errors.Validation("invalid_otp", "كود التحقق غلط")
	}

	if err := s.repo.MarkOtpVerified(ctx, otp.ID); err != nil {
		return nil, err
	}

	owner, err := s.repo.UpsertByPhone(ctx, phone, now)
	if err != nil {
		return nil, err
	}

	token, err := s.issuePortalToken(owner.ID, owner.Phone)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		OK:          true,
		AccessToken: token,
		Owner:       shapeOwner(*owner),
	}, nil
}

func (s *Service) issuePortalToken(ownerID string, _ *string) (string, error) {
	// Simple JWT implementation - in production use a proper JWT library
	// For now, return a placeholder token
	return fmt.Sprintf("portal_%s_%d", ownerID, time.Now().Unix()), nil
}

func normalizePhone(phone string) string {
	p := strings.ReplaceAll(strings.TrimSpace(phone), " ", "")
	p = strings.ReplaceAll(p, "-", "")
	p = strings.ReplaceAll(p, "(", "")
	p = strings.ReplaceAll(p, ")", "")

	if matched, _ := regexp.MatchString(`^01\d{9}$`, p); matched {
		return "+2" + p
	}
	if matched, _ := regexp.MatchString(`^\+20\d{9}$`, p); matched {
		return p
	}
	if matched, _ := regexp.MatchString(`^20\d{9}$`, p); matched {
		return "+" + p
	}
	if matched, _ := regexp.MatchString(`^\+?\d{7,15}$`, p); matched {
		if !strings.HasPrefix(p, "+") {
			p = "+" + p
		}
		return p
	}
	return ""
}

func normalizeEmail(email string) string {
	e := strings.ToLower(strings.TrimSpace(email))
	if e == "" {
		return ""
	}
	if !regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`).MatchString(e) {
		return ""
	}
	return e
}

func generateOtpCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func shapeOwner(o Owner) *Owner {
	resp := &Owner{
		ID:        o.ID,
		IsActive:  o.IsActive,
		CreatedAt: o.CreatedAt,
	}
	if o.Phone != nil {
		resp.Phone = o.Phone
	}
	if o.Email != nil {
		resp.Email = o.Email
	}
	if o.Name != nil {
		resp.Name = o.Name
	}
	if o.AvatarURL != nil {
		resp.AvatarURL = o.AvatarURL
	}
	return resp
}
