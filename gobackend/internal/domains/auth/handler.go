package auth

import (
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/audit"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/validate"
	"github.com/gofiber/fiber/v2"
)

// Handler exposes authentication HTTP endpoints.
type Handler struct {
	service     *Service
	auditService *audit.Service
	cfg         AuthCookieConfig
	appCfg      *config.Config
}

// AuthCookieConfig holds cookie settings for the auth handlers.
type AuthCookieConfig struct {
	Name             string
	// AccessCookieName is the name of the short-lived access token cookie.
	// When set, login/refresh responses also set this httpOnly cookie so the
	// frontend can authenticate without storing the token in localStorage.
	AccessCookieName string
	Domain           string
	MaxAge           time.Duration
	Secure           bool
	SameSite         string
}

// NewHandler creates a handler for auth routes.
func NewHandler(service *Service, auditService *audit.Service, cookieCfg AuthCookieConfig, appCfg *config.Config) *Handler {
	return &Handler{service: service, auditService: auditService, cfg: cookieCfg, appCfg: appCfg}
}

// RegisterRoutes wires the auth endpoints under the provided router.
func (h *Handler) RegisterRoutes(r fiber.Router) {
	g := r.Group("/auth")
	g.Post("/signup", h.Signup)
	g.Post("/login", h.Login)
	g.Post("/logout", h.Logout)
	g.Post("/refresh", h.Refresh)
	g.Post("/password/forgot", h.RequestPasswordReset)
	g.Post("/password/reset", h.ResetPassword)
	g.Post("/verify-email", h.VerifyEmail)
	g.Post("/resend-verification", h.ResendVerification)
	g.Post("/bootstrap-admin", h.BootstrapAdmin)
	g.Get("/me", middleware.RequireAuth(h.appCfg), h.Me)

	// Dev login endpoints (only in non-production AND when explicitly enabled)
	if !h.appCfg.IsProduction() {
		if h.appCfg.Auth.AllowDevMerchantBoot {
			g.Post("/dev-merchant-login", h.DevMerchantLogin)
		}
		if h.appCfg.Auth.AllowDevCourierBoot {
			g.Post("/dev-courier-login", h.DevCourierLogin)
		}
		if h.appCfg.Auth.AllowDevCustomerBoot {
			g.Post("/dev-customer-login", h.DevCustomerLogin)
		}
	}

	// Complete a login that requires a second factor. Public: the challenge
	// token (not an access token) is what proves the password step succeeded.
	g.Post("/2fa/login", h.Login2FA)

	g.Post("/2fa/generate", middleware.RequireAuth(h.appCfg), h.Generate2FA)
	g.Post("/2fa/enable", middleware.RequireAuth(h.appCfg), h.Enable2FA)
	g.Post("/2fa/disable", middleware.RequireAuth(h.appCfg), h.Disable2FA)
	g.Post("/2fa/verify", middleware.RequireAuth(h.appCfg), h.Verify2FA)
	g.Get("/me", middleware.RequireAuth(h.appCfg), h.Me)
	g.Post("/change-password", middleware.RequireAuth(h.appCfg), h.ChangePassword)
	g.Post("/deactivate", middleware.RequireAuth(h.appCfg), h.Deactivate)
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	token := ""
	if authHeader := c.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if token == "" {
		token = h.getRefreshToken(c)
	}

	// Optional {"all": true} body closes every session of the user, not
	// just the family this token belongs to.
	var body struct {
		All bool `json:"all"`
	}
	_ = c.BodyParser(&body)

	if token != "" && h.service != nil {
		if err := h.service.Logout(c.UserContext(), token, body.All, extractMeta(c)); err != nil {
			return err
		}
		// Record logout event
		if h.auditService != nil {
			_ = h.auditService.RecordLogout(c.UserContext(), token)
		}
	}

	h.clearAuthCookie(c)
	return c.JSON(fiber.Map{"success": true, "message": "تم تسجيل الخروج بنجاح"})
}

func (h *Handler) Signup(c *fiber.Ctx) error {
	var req SignupRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	resp, err := h.service.Signup(c.UserContext(), req, extractMeta(c))
	if err != nil {
		return err
	}
	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	result, err := h.service.Login(c.UserContext(), req, extractMeta(c))
	if err != nil {
		return err
	}

	// 2FA required: the password was correct but no tokens exist yet. Return
	// the challenge so the client can complete the second factor via
	// POST /auth/2fa/login. No cookies are set at this stage.
	if result.Challenge != "" {
		return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
			"requires2FA": true,
			"challenge":   result.Challenge,
		}})
	}

	resp := result.Auth
	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)

	// Record login audit event
	if h.auditService != nil && resp.User.ID != "" {
		_, _ = h.auditService.RecordLogin(
			c.UserContext(),
			resp.User.ID,
			resp.User.Email,
			string(resp.User.Role),
			c.IP(),
			c.Get("User-Agent"),
			resp.Token.RefreshToken,
		)
	}

	return c.JSON(fiber.Map{"success": true, "data": resp})
}

// Login2FA completes a two-factor login: it exchanges the challenge returned by
// Login (after a correct password on a 2FA-enabled account) plus a valid TOTP
// code for a full token pair, setting the auth cookies on success.
func (h *Handler) Login2FA(c *fiber.Ctx) error {
	var req Login2FARequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	resp, err := h.service.Login2FA(c.UserContext(), req, extractMeta(c))
	if err != nil {
		return err
	}

	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)

	if h.auditService != nil && resp.User.ID != "" {
		_, _ = h.auditService.RecordLogin(
			c.UserContext(),
			resp.User.ID,
			resp.User.Email,
			string(resp.User.Role),
			c.IP(),
			c.Get("User-Agent"),
			resp.Token.RefreshToken,
		)
	}

	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) Me(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	u, err := h.service.Me(c.UserContext(), user.ID)
	if err != nil {
		return err
	}
	if u == nil {
		return errors.NotFound("user", user.ID)
	}
	return c.JSON(fiber.Map{"success": true, "data": u})
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	token := h.getRefreshToken(c)
	if token == "" {
		return errors.Unauthorized("missing_refresh_token", "refresh token مطلوب")
	}

	resp, err := h.service.Refresh(c.UserContext(), token, extractMeta(c))
	if err != nil {
		return err
	}
	// Both cookies rotate together: the refresh cookie only changes when a
	// new token was minted (grace responses re-send the identical value).
	if resp.Token.RefreshToken != "" {
		h.setAuthCookie(c, resp.Token.RefreshToken)
	}
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)
	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) RequestPasswordReset(c *fiber.Ctx) error {
	var req PasswordResetRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	if err := h.service.RequestPasswordReset(c.UserContext(), req, extractMeta(c)); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "إذا كان البريد موجوداً، ستصله رسالة إعادة التعيين"})
}

func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req PasswordResetConfirm
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	if err := h.service.ResetPassword(c.UserContext(), req, extractMeta(c)); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم تغيير كلمة المرور بنجاح"})
}

func (h *Handler) VerifyEmail(c *fiber.Ctx) error {
	var req VerifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	if err := h.service.VerifyEmail(c.UserContext(), req, extractMeta(c)); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم تأكيد البريد الإلكتروني"})
}

func (h *Handler) ResendVerification(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	if err := h.service.ResendVerification(c.UserContext(), req.Email, extractMeta(c)); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم إرسال رابط التحقق"})
}

func (h *Handler) BootstrapAdmin(c *fiber.Ctx) error {
	var req BootstrapAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	admin, err := h.service.BootstrapAdmin(c.UserContext(), req, extractMeta(c))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": admin})
}

func (h *Handler) DevMerchantLogin(c *fiber.Ctx) error {
	var req DevMerchantLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	resp, err := h.service.DevMerchantLogin(c.UserContext(), req, extractMeta(c))
	if err != nil {
		return err
	}
	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)
	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) DevCourierLogin(c *fiber.Ctx) error {
	var req DevCourierLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	resp, err := h.service.DevCourierLogin(c.UserContext(), extractMeta(c))
	if err != nil {
		return err
	}
	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)
	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) DevCustomerLogin(c *fiber.Ctx) error {
	var req DevCustomerLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}

	resp, err := h.service.DevCustomerLogin(c.UserContext(), extractMeta(c))
	if err != nil {
		return err
	}
	h.setAuthCookie(c, resp.Token.RefreshToken)
	h.setAccessCookie(c, resp.Token.AccessToken, h.appCfg.Auth.AccessTokenExpiry)
	return c.JSON(fiber.Map{"success": true, "data": resp})
}

func (h *Handler) Generate2FA(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	secret, otpauthURL, err := h.service.Generate2FASecret(c.UserContext(), user.ID, user.Email)
	if err != nil {
		return errors.Internal("2fa_generate_failed", err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"secret":     secret,
			"otpauthUrl": otpauthURL,
		},
	})
}

func (h *Handler) Enable2FA(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req struct {
		Secret string `json:"secret" validate:"required"`
		Code   string `json:"code" validate:"required,len=6"`
	}
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	codes, err := h.service.Confirm2FA(c.UserContext(), user.ID, req.Secret, req.Code)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{
		"success": true,
		"message": "تم تفعيل المصادقة الثنائية",
		"data":    fiber.Map{"recoveryCodes": codes},
	})
}

func (h *Handler) Disable2FA(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req struct {
		Code string `json:"code" validate:"required,len=6"`
	}
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	if err := h.service.Disable2FA(c.UserContext(), user.ID, req.Code); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم تعطيل المصادقة الثنائية"})
}

func (h *Handler) Verify2FA(c *fiber.Ctx) error {
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return errors.Unauthorized("unauthenticated", "يجب تسجيل الدخول")
	}

	var req struct {
		Code string `json:"code" validate:"required,len=6"`
	}
	if err := c.BodyParser(&req); err != nil {
		return errors.Validation("invalid_body", "تعذر قراءة بيانات الطلب")
	}
	if err := validate.Struct(req); err != nil {
		return err
	}

	valid, err := h.service.Verify2FA(c.UserContext(), user.ID, req.Code)
	if err != nil {
		return err
	}
	if !valid {
		return errors.Unauthorized("invalid_2fa_code", "رمز المصادقة الثنائية غير صحيح")
	}
	return c.JSON(fiber.Map{"success": true, "message": "تم التحقق بنجاح"})
}

func (h *Handler) setAuthCookie(c *fiber.Ctx, refreshToken string) {
	if h.cfg.Name == "" {
		return
	}
	expiresAt := time.Now().Add(h.cfg.MaxAge)
	cookie := fiber.Cookie{
		Name:     h.sessionCookieName(c),
		Value:    refreshToken,
		Path:     "/",
		HTTPOnly: true,
		Secure:   h.cfg.Secure,
		SameSite: h.cfg.SameSite,
		Domain:   h.cfg.Domain,
		Expires:  expiresAt,
		MaxAge:   int(h.cfg.MaxAge.Seconds()),
	}
	if cookie.SameSite == "" {
		cookie.SameSite = "Lax"
	}
	c.Cookie(&cookie)
}

func (h *Handler) setAccessCookie(c *fiber.Ctx, accessToken string, expiry time.Duration) {
	if h.cfg.AccessCookieName == "" || accessToken == "" {
		return
	}
	expiresAt := time.Now().Add(expiry)
	cookie := fiber.Cookie{
		Name:     h.accessCookieName(c),
		Value:    accessToken,
		Path:     "/",
		HTTPOnly: true,
		Secure:   h.cfg.Secure,
		SameSite: h.cfg.SameSite,
		Domain:   h.cfg.Domain,
		Expires:  expiresAt,
		MaxAge:   int(expiry.Seconds()),
	}
	if cookie.SameSite == "" {
		cookie.SameSite = "Lax"
	}
	c.Cookie(&cookie)
}

func (h *Handler) clearAuthCookie(c *fiber.Ctx) {
	expired := time.Unix(0, 0)
	// Clear the scoped names for THIS app, plus every legacy/unscooped variant
	// so upgrades and old cookies never linger.
	scope := appScope(c)
	names := []string{
		h.sessionCookieName(c),
		h.accessCookieName(c),
	}
	if h.cfg.Name != "" {
		names = append(names, h.cfg.Name)
	}
	if h.cfg.AccessCookieName != "" {
		names = append(names, h.cfg.AccessCookieName)
	}
	if h.cfg.Name != "" {
		names = append(names, h.cfg.Name+scope+"_access")
	}
	for _, name := range names {
		if name == "" {
			continue
		}
		c.Cookie(&fiber.Cookie{
			Name:     name,
			Value:    "",
			Path:     "/",
			HTTPOnly: true,
			Secure:   h.cfg.Secure,
			SameSite: h.cfg.SameSite,
			Domain:   h.cfg.Domain,
			Expires:  expired,
			MaxAge:   -1,
		})
	}
}

func extractMeta(c *fiber.Ctx) RequestMeta {
	return RequestMeta{
		IP:        c.IP(),
		UserAgent: c.Get("User-Agent"),
	}
}

// appScope returns a per-client-app cookie suffix. The dashboard and the
// marketplace are separate products with separate logins — when they share
// one API host, cookies must be namespaced (ray_session-dashboard,
// ray_session-market, ...) or a login in one app silently replaces the other
// app's session. The scope arrives via the X-App-Scope request header.
func appScope(c *fiber.Ctx) string {
	raw := strings.ToUpper(strings.TrimSpace(c.Get("X-App-Scope")))
	if raw == "" {
		return ""
	}
	var b strings.Builder
	b.WriteByte('-')
	for _, r := range raw {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
		if b.Len() >= 21 {
			break
		}
	}
	if b.Len() <= 1 {
		return ""
	}
	return b.String()
}

func (h *Handler) sessionCookieName(c *fiber.Ctx) string {
	name := h.cfg.Name
	if name == "" {
		name = "ray_session"
	}
	return name + appScope(c)
}

func (h *Handler) accessCookieName(c *fiber.Ctx) string {
	if h.cfg.AccessCookieName == "" {
		return ""
	}
	return h.cfg.AccessCookieName + appScope(c)
}

// getRefreshToken resolves the refresh token from the scoped session cookie,
// then legacy/unscooped cookie names, then the JSON body.
func (h *Handler) getRefreshToken(c *fiber.Ctx) string {
	if t := c.Cookies(h.sessionCookieName(c)); t != "" {
		return t
	}
	if h.cfg.Name != "" {
		if t := c.Cookies(h.cfg.Name); t != "" {
			return t
		}
	}
	if t := c.Cookies("ray_session"); t != "" {
		return t
	}
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	_ = c.BodyParser(&body)
	return body.RefreshToken
}
