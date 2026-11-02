package shops

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"
)

// ---------------------------------------------------------------------------
// Editing modes and capability policy
// ---------------------------------------------------------------------------

// EditingMode is the editor mode a user is operating in. Modes are NOT
// authorization boundaries by themselves — the backend enforces restrictions
// regardless of the mode claimed by the client.
type EditingMode string

const (
	ModeVisual    EditingMode = "visual"
	ModeHTMLOnly  EditingMode = "html_only"
	ModeCSSOnly   EditingMode = "css_only"
	ModeFullCode  EditingMode = "full_code"
)

// CapabilityPolicy defines what each mode is allowed to send to the backend.
// The server validates the payload against the mode before persisting.
type CapabilityPolicy struct {
	AllowCustomJS    bool
	AllowCustomCSS   bool
	AllowRawHTML     bool
	AllowIframe      bool
	AllowExternalURL bool
	AllowDataURI     bool
	MaxHTMLSize      int
	MaxCSSSize       int
	MaxJSSize        int
}

// ModePolicies returns the capability policy for each editing mode.
func ModePolicies() map[EditingMode]*CapabilityPolicy {
	return map[EditingMode]*CapabilityPolicy{
		ModeVisual: {
			AllowCustomJS:   false,
			AllowCustomCSS:  true,
			AllowRawHTML:    false,
			AllowIframe:     false,
			AllowExternalURL: true,
			AllowDataURI:    false,
			MaxHTMLSize:     0,
			MaxCSSSize:      0,
			MaxJSSize:       0,
		},
		ModeHTMLOnly: {
			AllowCustomJS:   false,
			AllowCustomCSS:  false,
			AllowRawHTML:    true,
			AllowIframe:     false,
			AllowExternalURL: true,
			AllowDataURI:    false,
			MaxHTMLSize:     64 * 1024,
			MaxCSSSize:      0,
			MaxJSSize:       0,
		},
		ModeCSSOnly: {
			AllowCustomJS:   false,
			AllowCustomCSS:  true,
			AllowRawHTML:    false,
			AllowIframe:     false,
			AllowExternalURL: false,
			AllowDataURI:    false,
			MaxHTMLSize:     0,
			MaxCSSSize:      64 * 1024,
			MaxJSSize:       0,
		},
		ModeFullCode: {
			AllowCustomJS:   true,
			AllowCustomCSS:  true,
			AllowRawHTML:    true,
			AllowIframe:     true,
			AllowExternalURL: true,
			AllowDataURI:    true,
			MaxHTMLSize:     256 * 1024,
			MaxCSSSize:      64 * 1024,
			MaxJSSize:       64 * 1024,
		},
	}
}

var (
	scriptTagRe     = regexp.MustCompile(`(?is)<script\b[^>]*>.*?</script>`)
	eventHandlerRe  = regexp.MustCompile(`(?i)\bon(click|dblclick|mousedown|mouseup|mouseover|mouseout|mousemove|keydown|keyup|keypress|submit|change|focus|blur|load|error|abort|reset|resize|scroll|unload|beforeunload|contextmenu|drag|drop|cut|copy|paste|input|invalid|select|toggle|show|hide|animationstart|animationiteration|animationend|transitionend|wheel|touchstart|touchmove|touchend|touchcancel|pointerdown|pointerup|pointermove|pointerover|pointerout|pointerenter|pointerleave|gotpointercapture|lostpointercapture)\s*=`)
	javascriptURLRe = regexp.MustCompile(`(?i)javascript\s*:`)
	vbscriptURLRe   = regexp.MustCompile(`(?i)vbscript\s*:`)
	dataURLRe       = regexp.MustCompile(`(?i)data\s*:`)
	importCSSRe     = regexp.MustCompile(`(?is)@import\s+`)
	expressionRe    = regexp.MustCompile(`(?i)expression\s*\(`)
	urlInCSSRe      = regexp.MustCompile(`(?i)url\s*\(`)
)

func dangerousHTMLError(html string, mode EditingMode) error {
	policy, ok := ModePolicies()[mode]
	if !ok {
		return errors.Validation("invalid_mode", "unsupported editing mode")
	}
	if !policy.AllowRawHTML || !policy.AllowCustomJS {
		if scriptTagRe.MatchString(html) {
			return errors.Validation("script_tag_not_allowed", "script tags not allowed in this mode")
		}
		if eventHandlerRe.MatchString(html) {
			return errors.Validation("event_handler_not_allowed", "inline event handlers not allowed in this mode")
		}
		if javascriptURLRe.MatchString(html) {
			return errors.Validation("javascript_url_not_allowed", "javascript: URLs not allowed")
		}
		if vbscriptURLRe.MatchString(html) {
			return errors.Validation("vbscript_url_not_allowed", "vbscript: URLs not allowed")
		}
	}
	if !policy.AllowIframe && strings.Contains(strings.ToLower(html), "<iframe") {
		return errors.Validation("iframe_not_allowed", "iframe elements not allowed in this mode")
	}
	if !policy.AllowDataURI && dataURLRe.MatchString(html) {
		return errors.Validation("data_uri_not_allowed", "data: URLs not allowed")
	}
	if len(html) > policy.MaxHTMLSize && policy.MaxHTMLSize > 0 {
		return errors.Validation("html_too_large", fmt.Sprintf("HTML exceeds %d bytes", policy.MaxHTMLSize))
	}
	return nil
}

func dangerousCSSError(css string, mode EditingMode) error {
	policy, ok := ModePolicies()[mode]
	if !ok {
		return errors.Validation("invalid_mode", "unsupported editing mode")
	}
	if !policy.AllowCustomCSS {
		return errors.Validation("css_not_allowed", "CSS editing not allowed in this mode")
	}
	if importCSSRe.MatchString(css) {
		return errors.Validation("css_import_not_allowed", "@import not allowed for security")
	}
	if expressionRe.MatchString(css) {
		return errors.Validation("css_expression_not_allowed", "CSS expression() not allowed")
	}
	if !policy.AllowExternalURL && urlInCSSRe.MatchString(css) {
		return errors.Validation("css_url_not_allowed", "CSS url() external resources not allowed in this mode")
	}
	if len(css) > policy.MaxCSSSize && policy.MaxCSSSize > 0 {
		return errors.Validation("css_too_large", fmt.Sprintf("CSS exceeds %d bytes", policy.MaxCSSSize))
	}
	return nil
}

func dangerousJSError(js string, mode EditingMode) error {
	policy, ok := ModePolicies()[mode]
	if !ok {
		return errors.Validation("invalid_mode", "unsupported editing mode")
	}
	if !policy.AllowCustomJS {
		if scriptTagRe.MatchString(js) {
			return errors.Validation("script_not_allowed", "JavaScript not allowed in this mode")
		}
		if eventHandlerRe.MatchString(js) {
			return errors.Validation("event_handler_not_allowed", "event handlers not allowed in this mode")
		}
	}
	dangerousPatterns := []struct {
		re   *regexp.Regexp
		code string
		msg  string
	}{
		{regexp.MustCompile(`(?i)\bparent\s*\.`), "parent_access", "parent window access not allowed"},
		{regexp.MustCompile(`(?i)\btop\s*\.`), "top_access", "top window access not allowed"},
		{regexp.MustCompile(`(?i)\bopener\s*\.`), "opener_access", "opener access not allowed"},
		{regexp.MustCompile(`(?i)\bfetch\s*\(|XMLHttpRequest|ActiveXObject`), "network_access", "network requests not allowed outside preview sandbox"},
		{regexp.MustCompile(`(?i)\blocalStorage|sessionStorage`), "storage_access", "storage access not allowed"},
		{regexp.MustCompile(`(?i)\bdocument\.cookie`), "cookie_access", "cookie access not allowed"},
		{regexp.MustCompile(`(?i)\beval\s*\(|Function\s*\(|setTimeout\s*\(.*["']|setInterval\s*\(.*["']`), "code_injection", "dynamic code execution not allowed"},
	}
	for _, p := range dangerousPatterns {
		if p.re.MatchString(js) {
			return errors.Validation(p.code, p.msg)
		}
	}
	if len(js) > policy.MaxJSSize && policy.MaxJSSize > 0 {
		return errors.Validation("js_too_large", fmt.Sprintf("JS exceeds %d bytes", policy.MaxJSSize))
	}
	return nil
}

func configChecksum(config []byte) string {
	sum := sha256.Sum256(config)
	return hex.EncodeToString(sum[:])
}

func (s *BuilderService) SaveDraftVersion(
	ctx context.Context,
	shopID string,
	mode EditingMode,
	config *BuilderConfig,
	clientVersion int64,
) (*BuilderConfig, int64, string, error) {
	var exists bool
	err := s.repo.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM shops WHERE id = $1)", shopID).Scan(&exists)
	if err != nil {
		return nil, 0, "", err
	}
	if !exists {
		return nil, 0, "", errors.NotFound("shop_not_found", "المتجر غير موجود")
	}
	if config.Website != nil {
		if err := validateWebsiteTreeByMode(config.Website, mode); err != nil {
			return nil, 0, "", err
		}
	}
	configJSON, err := json.Marshal(config)
	if err != nil {
		return nil, 0, "", errors.Internal("marshal_failed", err)
	}
	checksum := configChecksum(configJSON)
	var currentVersion int64
	err = s.repo.pool.QueryRow(ctx,
		// Use MAX across all version_kinds: draft + published share the same
		// UNIQUE (shop_id, version_number) constraint, so we must compute a
		// globally monotonic sequence to avoid unique-key collisions.
		`SELECT COALESCE(MAX(version_number), 0) FROM builder_versions
		 WHERE shop_id = $1`, shopID).Scan(&currentVersion)
	if err != nil {
		return nil, 0, "", err
	}
	if clientVersion > 0 && currentVersion != clientVersion {
		return nil, currentVersion, checksum, errors.Conflict("version_conflict",
			fmt.Sprintf("현재 초안 버전(%d)과 클라이언트 버전(%d)이 일치하지 않습니다.", currentVersion, clientVersion))
	}
	newVersion := currentVersion + 1
	versionID := uuid.New()
	_, err = s.repo.pool.Exec(ctx,
		`INSERT INTO builder_versions
			(id, shop_id, version_number, version_kind, label, description,
			 author_id, author_role, config, checksum, created_at)
		 VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, NOW())`,
		versionID, shopID, newVersion, "자동 저장", "편집기 자동 저장 초안",
		nil, nil, configJSON, checksum)
	if err != nil {
		s.logger.Error("Failed to insert builder draft version", zap.Error(err), zap.String("shopId", shopID))
		return nil, 0, "", errors.Internal("version_insert_failed", err)
	}
	var updatedAt time.Time
	err = s.repo.pool.QueryRow(ctx,
		`UPDATE shops
			SET builder_config = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING updated_at`,
		configJSON, shopID).Scan(&updatedAt)
	if err != nil {
		return nil, 0, "", err
	}
	config.UpdatedAt = updatedAt
	return config, newVersion, checksum, nil
}

func (s *BuilderService) PublishDraft(
	ctx context.Context,
	shopID string,
	clientVersion int64,
) (*PublishResult, error) {
	var exists bool
	err := s.repo.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM shops WHERE id = $1 AND builder_config IS NOT NULL)`,
		shopID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.NotFound("config_not_found", "게시할 구성이 없습니다")
	}
	var currentVersion int64
	err = s.repo.pool.QueryRow(ctx,
		// Same global MAX so the published version number never collides with
		// a previously written draft row.
		`SELECT COALESCE(MAX(version_number), 0) FROM builder_versions
		 WHERE shop_id = $1`, shopID).Scan(&currentVersion)
	if err != nil {
		return nil, err
	}
	if clientVersion > 0 && currentVersion != clientVersion {
		return nil, errors.Conflict("version_conflict",
			fmt.Sprintf("현재 초안 버전(%d)과 클라이언트 버전(%d)이 일치하지 않습니다.", currentVersion, clientVersion))
	}
	var configJSON []byte
	var updatedAt time.Time
	err = s.repo.pool.QueryRow(ctx,
		`SELECT builder_config, updated_at FROM shops WHERE id = $1`,
		shopID).Scan(&configJSON, &updatedAt)
	if err != nil {
		return nil, err
	}
	var config BuilderConfig
	if err := json.Unmarshal(configJSON, &config); err != nil {
		return nil, errors.Internal("invalid_config", err)
	}
	newVersion := currentVersion + 1
	versionID := uuid.New()
	checksum := configChecksum(configJSON)
	_, err = s.repo.pool.Exec(ctx,
		`INSERT INTO builder_versions
			(id, shop_id, version_number, version_kind, label, description,
			 author_id, author_role, config, checksum, created_at)
		 VALUES ($1, $2, $3, 'published', $4, $5, $6, $7, $8, $9, NOW())`,
		versionID, shopID, newVersion, "게시", "사용자 게시",
		nil, nil, configJSON, checksum)
	if err != nil {
		s.logger.Error("Failed to insert builder published version", zap.Error(err), zap.String("shopId", shopID))
		return nil, errors.Internal("publish_version_failed", err)
	}
	_, err = s.repo.pool.Exec(ctx,
		`UPDATE shops
			SET builder_published_config = builder_config,
				builder_published_at = NOW(),
				builder_published_version_id = $1,
				updated_at = NOW()
			WHERE id = $2 AND builder_config IS NOT NULL`,
		versionID, shopID)
	if err != nil {
		return nil, err
	}
	return &PublishResult{
		VersionID:     versionID.String(),
		VersionNumber: newVersion,
		Checksum:      checksum,
		PublishedAt:   time.Now(),
	}, nil
}

func (s *BuilderService) RollbackToVersion(
	ctx context.Context,
	shopID string,
	versionID string,
) (*BuilderConfig, error) {
	uid, err := uuid.Parse(versionID)
	if err != nil {
		return nil, errors.Validation("invalid_version_id", "잘못된 버전 ID입니다")
	}
	var configJSON []byte
	var versionKind string
	err = s.repo.pool.QueryRow(ctx,
		`SELECT config, version_kind FROM builder_versions WHERE id = $1 AND shop_id = $2`,
		uid, shopID).Scan(&configJSON, &versionKind)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("version_not_found", "버전을 찾을 수 없습니다")
		}
		return nil, err
	}
	var config BuilderConfig
	if err := json.Unmarshal(configJSON, &config); err != nil {
		return nil, errors.Internal("invalid_config", err)
	}
	_, newVersion, _, err := s.SaveDraftVersion(ctx, shopID, ModeVisual, &config, 0)
	if err != nil {
		return nil, err
	}
	_ = newVersion
	var updatedAt time.Time
	configJSON, _ = json.Marshal(config)
	err = s.repo.pool.QueryRow(ctx,
		`UPDATE shops
			SET builder_config = $1, updated_at = NOW()
			WHERE id = $2
			RETURNING updated_at`,
		configJSON, shopID).Scan(&updatedAt)
	if err != nil {
		return nil, err
	}
	config.UpdatedAt = updatedAt
	return &config, nil
}

func (s *BuilderService) ListVersions(
	ctx context.Context,
	shopID string,
	limit int,
) ([]VersionInfo, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.repo.pool.Query(ctx,
		`SELECT id, version_number, version_kind, label, description,
			author_role, checksum, created_at
		 FROM builder_versions
		 WHERE shop_id = $1
		 ORDER BY version_number DESC
		 LIMIT $2`, shopID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var versions []VersionInfo
	for rows.Next() {
		var v VersionInfo
		var id uuid.UUID
		if err := rows.Scan(&id, &v.VersionNumber, &v.VersionKind, &v.Label,
			&v.Description, &v.AuthorRole, &v.Checksum, &v.CreatedAt); err != nil {
			return nil, err
		}
		v.ID = id.String()
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

func (s *BuilderService) GetVersion(
	ctx context.Context,
	shopID string,
	versionID string,
) (*BuilderConfig, error) {
	uid, err := uuid.Parse(versionID)
	if err != nil {
		return nil, errors.Validation("invalid_version_id", "잘못된 버전 ID입니다")
	}
	var configJSON []byte
	err = s.repo.pool.QueryRow(ctx,
		`SELECT config FROM builder_versions WHERE id = $1 AND shop_id = $2`,
		uid, shopID).Scan(&configJSON)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.NotFound("version_not_found", "버전을 찾을 수 없습니다")
		}
		return nil, err
	}
	var config BuilderConfig
	if err := json.Unmarshal(configJSON, &config); err != nil {
		return nil, errors.Internal("invalid_config", err)
	}
	return &config, nil
}

type PublishResult struct {
	VersionID     string    `json:"versionId"`
	VersionNumber int64     `json:"versionNumber"`
	Checksum      string    `json:"checksum"`
	PublishedAt   time.Time `json:"publishedAt"`
}

type VersionInfo struct {
	ID            string    `json:"id"`
	VersionNumber int64     `json:"versionNumber"`
	VersionKind   string    `json:"versionKind"`
	Label         string    `json:"label"`
	Description   string    `json:"description"`
	AuthorRole    string    `json:"authorRole"`
	Checksum      string    `json:"checksum"`
	CreatedAt     time.Time `json:"createdAt"`
}

func validateWebsiteTreeByMode(website map[string]any, mode EditingMode) error {
	if website == nil {
		return nil
	}
	rawComponents, hasComponents := website["components"]
	if !hasComponents {
		return nil
	}
	components, ok := rawComponents.(map[string]any)
	if !ok {
		return errors.Validation("invalid_components", "components는 객체여야 합니다")
	}
	for cid, c := range components {
		node, ok := c.(map[string]any)
		if !ok {
			continue
		}
		if customCode, ok := node["customCode"].(map[string]any); ok {
			if html, ok := customCode["tsxSnippet"].(string); ok && html != "" {
				if err := dangerousHTMLError(html, mode); err != nil {
					return errors.Validation("custom_code_html_"+cid, err.Error())
				}
			}
			if css, ok := customCode["css"].(string); ok && css != "" {
				if err := dangerousCSSError(css, mode); err != nil {
					return errors.Validation("custom_code_css_"+cid, err.Error())
				}
			}
			if js, ok := customCode["js"].(string); ok && js != "" {
				if err := dangerousJSError(js, mode); err != nil {
					return errors.Validation("custom_code_js_"+cid, err.Error())
				}
			}
			if tsx, ok := customCode["tsx"].(string); ok && tsx != "" {
				if err := dangerousHTMLError(tsx, mode); err != nil {
					return errors.Validation("custom_code_tsx_"+cid, err.Error())
				}
			}
		}
		if props, ok := node["props"].(map[string]any); ok {
			if html, ok := props["html"].(string); ok && html != "" {
				if err := dangerousHTMLError(html, mode); err != nil {
					return errors.Validation("props_html_"+cid, err.Error())
				}
			}
		}
	}
	return nil
}