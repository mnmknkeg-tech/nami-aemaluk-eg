# Security Audit Report - Ray Platform

> ملاحظة تحديث (ستاك Go الحالي): الباك الوحيد هو `gobackend/` (Go 1.25 + Fiber — باك NestJS القديم حُذف 2026-08-24). حيث يشير هذا التقرير إلى مسارات `backend/...` القديمة، فالمعادل الحالي: نقطة الدخول `gobackend/cmd/api/main.go`، والتحقق من الأسرار في الإنتاج عبر `gobackend/internal/config/config.go` (إلزام `JWT_SECRET`)، والحماية من حقن SQL عبر استعلامات pgx المعاملة بدل Prisma. باقي التقرير محفوظ كما هو.

**Date:** March 19, 2026  
**Auditor:** Cascade AI  
**Scope:** Backend Authentication & Authorization, Frontend Security

---

## Executive Summary

The Ray platform implements a robust security architecture with JWT-based authentication and role-based access control (RBAC). This audit identifies the current security posture and provides recommendations for improvement.

---

## 1. Authentication Security

### 1.1 JWT Implementation ✅

**File (current Go equivalent):** `gobackend/internal/domains/auth/*` (token service) + `gobackend/internal/config/config.go` للتحقق من الأسرار في الإنتاج (المرجع التاريخي: `backend/auth/jwt.strategy.ts` في باك NestJS المتقاعد)

| Aspect | Status | Details |
|--------|--------|---------|
| JWT Secret | ✅ Secure | Production requires `JWT_SECRET` env var |
| Token Expiration | ✅ Configurable | Default 7 days, configurable via `JWT_EXPIRES_IN` |
| Token Validation | ✅ Active | Validates user exists and is active |
| Cookie Support | ✅ Yes | Supports `ray_session` cookie + Bearer token |

**Strengths:**
- Production environment enforces JWT_SECRET requirement
- Token expiration is enforced (`ignoreExpiration: false`)
- User active status is checked on every request
- Merchants must have approved shop to access protected routes

**Recommendations:**
- Consider shorter token expiration (e.g., 1 hour) with refresh tokens
- Add rate limiting on authentication endpoints

### 1.2 Password Reset Tokens ✅

- Password reset tokens expire in 15 minutes
- Token type is verified (`typ: 'password_reset'`)

---

## 2. Authorization Security

### 2.1 Role-Based Access Control (RBAC) ✅

**Files (current Go equivalent):** `gobackend/internal/platform/middleware/*` (auth + RBAC middleware — المرجع التاريخي: `backend/auth/guards/roles.guard.ts`, `backend/auth/decorators/roles.decorator.ts` في باك NestJS المتقاعد)

| Role | Access Level |
|------|-------------|
| `admin` | Full system access |
| `merchant` | Shop-specific access |
| `courier` | Delivery operations |
| `customer` | Basic user features |

**Implementation:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'merchant')
```

**Strengths:**
- Guards are properly applied to protected endpoints
- Role comparison is case-insensitive
- Multiple roles can be specified per endpoint

### 2.2 Resource Ownership Checks ✅

The platform validates resource ownership:

- Merchants can only access their own shop data
- Shop ID from JWT token is compared with requested resource
- Admin role bypasses ownership checks

**Example from `shop.controller.ts`:**
```typescript
if (role !== 'ADMIN' && req.user.shopId !== id) {
  throw new ForbiddenException('غير مصرح');
}
```

---

## 3. Input Validation

### 3.1 DTO Validation ✅

The backend uses class-validator decorators for input validation.

**Recommendations:**
- Ensure all endpoints have proper DTO validation
- Add sanitization for user-generated content

### 3.2 SQL Injection Prevention ✅

استعلامات pgx المعاملة تُستخدم في `gobackend/internal/domains/*` (repositories)، وهي توفر حماية تلقائية من حقن SQL عبر parameterized queries (بدل Prisma في الباك المتقاعد).

---

## 4. CORS & Security Headers

### 4.1 CORS Configuration

**File (current Go equivalent):** `gobackend/cmd/api/main.go` (نقطة الدخول) + CORS في `gobackend/internal/platform/middleware/cors.go` (المرجع التاريخي: `backend/main.ts` في باك NestJS المتقاعد)

CORS is configured for the frontend origin. In production:
- Origins should be strictly defined
- Credentials should be enabled only for same-origin requests

### 4.2 Recommended Security Headers

Add these headers via middleware or helmet:

| Header | Purpose |
|--------|---------|
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `X-XSS-Protection: 1; mode=block` | XSS protection |
| `Strict-Transport-Security` | Force HTTPS |
| `Content-Security-Policy` | Control resource loading |

---

## 5. Rate Limiting ✅

**Files (current Go equivalent):** `gobackend/internal/platform/middleware/*` (rate limiter + slow-down — المرجع التاريخي: `backend/middleware/rate-limit.middleware.ts`, `backend/middleware/slow-down.middleware.ts` في باك NestJS المتقاعد)

Rate limiting is implemented with:
- Request counting per client ID
- Automatic cleanup of expired entries
- Configurable limits and windows

---

## 6. File Upload Security

### 6.1 Image Uploads

**File (current Go equivalent):** `gobackend/internal/domains/media/*` و`gobackend/internal/domains/shops/*` (المرجع التاريخي: `backend/shop.controller.ts` في باك NestJS المتقاعد)

- File size limits are enforced (5MB for banners)
- File type validation should be added
- Consider virus scanning for production

**Recommendations:**
- Add explicit MIME type validation
- Implement file content inspection
- Store uploads in isolated storage (R2/S3)

---

## 7. Frontend Security

### 7.1 Token Storage

Tokens are stored in:
- `localStorage` for persistence
- `ray_session` cookie for SSR compatibility

**Risk:** XSS attacks can access localStorage tokens.

**Recommendations:**
- Move to httpOnly cookies for primary storage
- Implement short-lived tokens with refresh mechanism

### 7.2 XSS Prevention

React provides automatic XSS protection through JSX escaping. However:
- Avoid `dangerouslySetInnerHTML`
- Sanitize any user-generated HTML content
- Implement CSP headers

---

## 8. Environment Variables Security ✅

**File:** `.env.local` (gitignored)

- Production secrets must be set via platform environment variables
- `JWT_SECRET` is required in production
- Admin bootstrap uses secure token (`ADMIN_BOOTSTRAP_TOKEN`)

---

## 9. Security Checklist

| Item | Status | Priority |
|------|--------|----------|
| JWT authentication | ✅ Implemented | - |
| RBAC authorization | ✅ Implemented | - |
| SQL injection protection | ✅ استعلامات pgx المعاملة | - |
| Rate limiting | ✅ Implemented | - |
| CORS configuration | ⚠️ Review needed | Medium |
| Security headers | ❌ Not implemented | High |
| Input sanitization | ⚠️ Partial | Medium |
| File type validation | ⚠️ Partial | High |
| httpOnly cookies | ❌ Not implemented | High |
| Refresh token rotation | ❌ Not implemented | Medium |
| Audit logging | ❌ Not implemented | Medium |
| Password strength policy | ⚠️ Partial | Low |

---

## 10. Recommendations Summary

### High Priority
1. **Add security headers middleware** - Implement helmet or custom middleware
2. **Implement httpOnly cookies** - Move session tokens to httpOnly cookies
3. **Add file type validation** - Validate MIME types on uploads

### Medium Priority
1. **Implement refresh tokens** - Short-lived access tokens with refresh rotation
2. **Add audit logging** - Log sensitive operations (auth, admin actions)
3. **Review CORS configuration** - Ensure production origins are strict

### Low Priority
1. **Password strength policy** - Enforce minimum password complexity
2. **Implement CSRF protection** - If using cookie-based sessions
3. **Add security monitoring** - Alert on suspicious patterns

---

## 11. Test Credentials (Development Only)

**Admin Bootstrap:**
```bash
POST /api/v1/auth/bootstrap-admin
Authorization: Bearer <ADMIN_BOOTSTRAP_TOKEN>
```

**Note:** Admin bootstrap is one-time in production unless `ADMIN_BOOTSTRAP_ALLOW_RESET=true`.

---

## Conclusion

The Ray platform has a solid security foundation with proper authentication and authorization mechanisms. The main areas for improvement are:
1. Security headers implementation
2. Token storage security (httpOnly cookies)
3. File upload validation

Implementing the high-priority recommendations will significantly improve the security posture of the application.

---

**Report Generated:** March 19, 2026  
**Next Audit Recommended:** After implementing high-priority fixes
