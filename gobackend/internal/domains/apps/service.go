package apps

import (
	"context"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
)

// Service implements the Apps domain business logic.
type Service struct {
	repo *Repository
}

// NewService creates a new apps service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// ListApps returns all available apps.
func (s *Service) ListApps(ctx context.Context) ([]AppResponse, error) {
	apps, err := s.repo.ListApps(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]AppResponse, len(apps))
	for i, a := range apps {
		out[i] = shapeApp(a)
	}
	return out, nil
}

// ListMyApps returns installed apps for a shop.
func (s *Service) ListMyApps(ctx context.Context, shopID string) ([]ShopAppResponse, error) {
	if strings.TrimSpace(shopID) == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	shopApps, err := s.repo.ListShopApps(ctx, shopID)
	if err != nil {
		return nil, err
	}
	out := make([]ShopAppResponse, len(shopApps))
	for i, sa := range shopApps {
		out[i] = shapeShopApp(sa)
	}
	return out, nil
}

// Install installs an app for a shop.
func (s *Service) Install(ctx context.Context, shopID, appKey string) (*ShopAppResponse, error) {
	if strings.TrimSpace(shopID) == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	key := strings.ToLower(strings.TrimSpace(appKey))
	if key == "" {
		return nil, errors.Validation("appKey_required", "appKey مطلوب")
	}

	app, err := s.repo.FindByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, errors.NotFound("app", key)
	}

	sa, err := s.repo.UpsertShopApp(ctx, shopID, app.ID)
	if err != nil {
		return nil, err
	}
	sa.AppKey = app.Key
	sa.AppName = app.Name
	sa.AppVersion = app.Version
	resp := shapeShopApp(*sa)
	return &resp, nil
}

// Uninstall uninstalls an app from a shop.
func (s *Service) Uninstall(ctx context.Context, shopID, appKey string) (*InstallResponse, error) {
	if strings.TrimSpace(shopID) == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	key := strings.ToLower(strings.TrimSpace(appKey))
	if key == "" {
		return nil, errors.Validation("appKey_required", "appKey مطلوب")
	}

	app, err := s.repo.FindByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, errors.NotFound("app", key)
	}

	existing, err := s.repo.FindShopApp(ctx, shopID, app.ID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		ok := false
		return &InstallResponse{OK: true, Uninstalled: &ok}, nil
	}

	if err := s.repo.UninstallShopApp(ctx, existing.ID); err != nil {
		return nil, err
	}
	ok := true
	return &InstallResponse{OK: true, Uninstalled: &ok}, nil
}

// SetActive enables or disables an installed app.
func (s *Service) SetActive(ctx context.Context, shopID, appKey string, active bool) (*ShopAppResponse, error) {
	if strings.TrimSpace(shopID) == "" {
		return nil, errors.Validation("shopId_required", "shopId مطلوب")
	}
	key := strings.ToLower(strings.TrimSpace(appKey))
	if key == "" {
		return nil, errors.Validation("appKey_required", "appKey مطلوب")
	}

	app, err := s.repo.FindByKey(ctx, key)
	if err != nil {
		return nil, err
	}
	if app == nil {
		return nil, errors.NotFound("app", key)
	}

	existing, err := s.repo.FindShopApp(ctx, shopID, app.ID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errors.Validation("app_not_installed", "App غير مثبت")
	}
	if existing.Status != "INSTALLED" {
		return nil, errors.Forbidden("app_not_installed", "App غير مثبت")
	}

	updated, err := s.repo.SetActive(ctx, existing.ID, active)
	if err != nil {
		return nil, err
	}
	updated.AppKey = app.Key
	updated.AppName = app.Name
	updated.AppVersion = app.Version
	resp := shapeShopApp(*updated)
	return &resp, nil
}

func shapeApp(a App) AppResponse {
	return AppResponse{
		ID:          a.ID,
		Key:         a.Key,
		Name:        a.Name,
		Description: a.Description,
		Version:     a.Version,
		Permissions: parseStringArray(a.Permissions),
		Hooks:       parseStringArray(a.Hooks),
		CreatedAt:   a.CreatedAt,
	}
}

func shapeShopApp(sa ShopApp) ShopAppResponse {
	return ShopAppResponse{
		ID:          sa.ID,
		ShopID:      sa.ShopID,
		Status:      sa.Status,
		IsActive:    sa.IsActive,
		InstalledAt: sa.InstalledAt,
		UpdatedAt:   sa.UpdatedAt,
		AppKey:      sa.AppKey,
		AppName:     sa.AppName,
		AppVersion:  sa.AppVersion,
	}
}
