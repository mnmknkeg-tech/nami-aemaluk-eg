package app

import (
	"context"
	"crypto/subtle"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/analytics"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/accounting"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/apps"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/audit"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/auth"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/bookings"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/cartevent"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/chat"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/customers"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/dashboard"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/feedback"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/finance"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/gallery"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/health"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/hr"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/invoice"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/mapdomain"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/measurement"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/media"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/notification"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/offers"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/orders"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/portal"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/pos"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/productcategories"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/products"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/publicinbox"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/reservation"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/reviews"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/search"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/seasonaloffers"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/shopimagemap"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/shops"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/support"
"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/consent"
"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/dsr"
"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/breach"
"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/reports"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/subscriptions"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/users"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/cache"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/lockout"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/mailer"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/redis"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/session"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/storage"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/telemetry"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

// App ties together the Fiber HTTP server, dependencies, and middleware.
type App struct {
	StartedAt             time.Time
	Config                *config.Config
	Fiber                 *fiber.App
	DB                    *db.Pool
	Redis                 *redis.Client
	Jobs                  *jobs.Client
	Metrics               *telemetry.Metrics
	Logger                *zap.Logger
	auditHandler         *audit.Handler
	authHandler           *auth.Handler
	usersHandler          *users.Handler
	shopsHandler          *shops.Handler
	productsHandler       *products.Handler
	ordersHandler         *orders.Handler
	mediaHandler          *media.Handler
	offersHandler         *offers.Handler
	notificationHandler   *notification.Handler
	analyticsHandler      *analytics.Handler
	hrHandler             *hr.Handler
	reservationHandler    *reservation.Handler
	searchHandler         *search.Handler
	chatHandler           *chat.Handler
	invoiceHandler        *invoice.Handler
	accountingHandler     *accounting.Handler
	supportHandler        *support.Handler
	customersHandler      *customers.Handler
	galleryHandler        *gallery.Handler
	feedbackHandler       *feedback.Handler
	publicInboxHandler    *publicinbox.Handler
	financeHandler        *finance.Handler
	reviewsHandler        *reviews.Handler
	seasonalOffersHandler *seasonaloffers.Handler
	mapHandler            *mapdomain.Handler
	builderHandler        *shops.BuilderHandler
	bookingsHandler       *bookings.Handler
	cartEventHandler      *cartevent.Handler
	measurementHandler    *measurement.Handler
	appsHandler           *apps.Handler
	shopImageMapHandler   *shopimagemap.Handler
	portalHandler         *portal.Handler
	dashboardHandler      *dashboard.Handler
	posHandler            *pos.Handler
	productCategoriesHandler *productcategories.Handler
consentHandler          *consent.Handler
dsrHandler              *dsr.Handler
breachHandler           *breach.Handler
reportsHandler          *reports.Handler
	subscriptionsHandler    *subscriptions.Handler
	compressionService    *compression.Service
}

// New creates a fully wired App.
func New(cfg *config.Config) (*App, error) {
	log, err := logger.New(cfg.Log.Level, cfg.Log.Format, cfg.App.Env)
	if err != nil {
		return nil, fmt.Errorf("init logger: %w", err)
	}
	logger.SetGlobal(log)

	// Infrastructure clients.
	var pool *db.Pool
	if cfg.DB.URL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		pool, err = db.New(ctx, cfg.DB, log)
		if err != nil {
			// db.New may still return a usable pool (e.g. connect worked but the
			// schema is incomplete), so keep it for development.
			log.Error("database initialization failed", zap.Error(err))
			// In production a missing/unmigrated DB is fatal; in development we
			// continue so the server can be started without a database.
			if cfg.IsProduction() {
				return nil, err
			}
		}
	}

	redisClient := redis.New(cfg.Redis, log)

	metrics, err := telemetry.Register(cfg.App.Name)
	if err != nil {
		log.Warn("failed to register metrics", zap.Error(err))
		metrics = &telemetry.Metrics{}
	}

	// Rate limiter and idempotency store need Redis but degrade to memory.
	rateLimiter, err := middleware.NewRateLimiter(cfg, redisClient.UniversalClient)
	if err != nil {
		log.Warn("failed to init rate limiter", zap.Error(err))
	}

	idempotencyStore := middleware.NewIdempotencyStore(redisClient.UniversalClient)

	// Background jobs client (best-effort; domain services fall back to
	// synchronous sends when Redis/asynq is unavailable).
	jobsClient := jobs.NewClient(cfg.Redis)

	// Real mailer, used by the background worker (and as a same-process
	// fallback) when SMTP is configured; otherwise emails are dropped/logged.
	appMailer := mailer.FromConfig(cfg)

	// Auth + Users + Shops domain wiring (requires database).
	// Object storage client (best-effort; media service degrades if not configured).
	s3Client, err := storage.NewS3Client(cfg.S3)
	if err != nil {
		log.Warn("s3 client not available", zap.Error(err))
		s3Client = nil
	}

	var (
		authHandler           *auth.Handler
		auditHandler          *audit.Handler
		usersHandler          *users.Handler
		shopsHandler          *shops.Handler
		productsHandler       *products.Handler
		ordersHandler         *orders.Handler
		mediaHandler          *media.Handler
		offersHandler         *offers.Handler
		notificationHandler   *notification.Handler
		analyticsHandler      *analytics.Handler
		hrHandler             *hr.Handler
		reservationHandler    *reservation.Handler
		searchHandler         *search.Handler
		chatHandler           *chat.Handler
		invoiceHandler        *invoice.Handler
		accountingHandler     *accounting.Handler
		supportHandler        *support.Handler
		customersHandler      *customers.Handler
		galleryHandler        *gallery.Handler
		feedbackHandler       *feedback.Handler
		publicInboxHandler    *publicinbox.Handler
		financeHandler        *finance.Handler
		reviewsHandler        *reviews.Handler
		seasonalOffersHandler *seasonaloffers.Handler
		mapHandler            *mapdomain.Handler
		builderHandler        *shops.BuilderHandler
		bookingsHandler       *bookings.Handler
		cartEventHandler      *cartevent.Handler
		measurementHandler    *measurement.Handler
		appsHandler           *apps.Handler
		shopImageMapHandler   *shopimagemap.Handler
		portalHandler         *portal.Handler
		dashboardHandler      *dashboard.Handler
		posHandler            *pos.Handler
		productCategoriesHandler *productcategories.Handler
consentHandler          *consent.Handler
dsrHandler              *dsr.Handler
breachHandler           *breach.Handler
reportsHandler          *reports.Handler
subscriptionsHandler    *subscriptions.Handler
	)
	var compressionService *compression.Service
	if pool != nil {
		// Initialize compression service early for all domains
		compressionService = compression.NewService(compression.Quality(cfg.Compression.DefaultQuality), cfg.Compression.Enabled)

		tokenService, err := auth.NewTokenService(cfg.Auth.JWTSecret, cfg.Auth.AccessTokenExpiry, cfg.Auth.RefreshTokenExpiry)
		if err != nil {
			log.Fatal("failed to create token service", zap.Error(err))
		}

		lockoutMgr := lockout.NewManager(redisClient.UniversalClient, cfg.RateLimit.AuthLockoutMax, cfg.RateLimit.AuthMax)

		authRepo := auth.NewRepository(pool)
		// Server-side refresh sessions live in Redis; without them every
		// /auth/refresh fails with "session_expired" and users get logged out
		// as soon as the 15-minute access token dies. NewStore falls back to
		// in-memory storage when Redis is unavailable. Sessions slide for
		// AUTH_REFRESH_TOKEN_EXPIRY of idle time, capped at
		// AUTH_SESSION_ABSOLUTE_TTL from the original login.
		sessionStore := session.NewStore(redisClient.UniversalClient,
			cfg.Auth.RefreshTokenExpiry,
			cfg.Auth.SessionAbsoluteTTL,
			cfg.Auth.RefreshGrace)
		authSvc := auth.NewService(cfg, authRepo, tokenService, lockoutMgr, appMailer, jobsClient, sessionStore)
		cookieCfg := auth.AuthCookieConfig{
			Name:     cfg.Auth.CookieName,
			// Short-lived access token cookie: with this set the frontend no
			// longer needs localStorage for auth (HttpOnly + Secure + Lax).
			AccessCookieName: cfg.Auth.AccessCookieName,
			Domain:   cfg.Auth.CookieDomain,
			MaxAge:   cfg.Auth.CookieMaxAge,
			Secure:   cfg.IsProduction(),
			SameSite: "Lax",
		}

		// Initialize audit service before auth handler
		auditRepo := audit.NewRepository(pool)
		auditSvc := audit.NewService(auditRepo)
		auditHandler = audit.NewHandler(auditSvc, cfg)

		authHandler = auth.NewHandler(authSvc, auditSvc, cookieCfg, cfg)

		usersRepo := users.NewRepository(pool)
		usersSvc := users.NewService(usersRepo)
		usersHandler = users.NewHandler(usersSvc, cfg)

		// Initialize notification service before shops/orders — both services
		// fan out notifications (new shop → admins, new order → shop + admins).
		notificationRepo := notification.NewRepository(pool)
		webPushService := notification.NewWebPushService(
			cfg.External.VAPIDSubject,
			cfg.External.VAPIDPublicKey,
			cfg.External.VAPIDPrivateKey,
		)
		notificationSvc := notification.NewService(notificationRepo, webPushService, jobsClient)
		notificationHandler = notification.NewHandler(notificationSvc, cfg)

		// Shared in-process TTL cache for hot public reads (shops/products/
		// offers lists) — absorbs repeated homepage/catalog queries.
		hotReadCache := cache.New()

		shopsRepo := shops.NewRepository(pool)
		shopsSvc := shops.NewService(cfg, shopsRepo, appMailer, notificationSvc, hotReadCache)
		shopsHandler = shops.NewHandler(shopsSvc, cfg)

		productsRepo := products.NewRepository(pool)
		productsSvc := products.NewService(productsRepo, compressionService, hotReadCache)
		productsHandler = products.NewHandler(productsSvc, cfg)

		ordersRepo := orders.NewRepository(pool)
		ordersSvc := orders.NewService(cfg, ordersRepo, notificationSvc)
		ordersHandler = orders.NewHandler(ordersSvc, cfg)

		builderSvc := shops.NewBuilderService(shopsRepo, log)
		builderHandler = shops.NewBuilderHandler(builderSvc)

		mediaRepo := media.NewRepository(pool)
		mediaSvc := media.NewService(cfg, mediaRepo, s3Client, jobsClient, compressionService)
		mediaHandler = media.NewHandler(mediaSvc, cfg)

		offersRepo := offers.NewRepository(pool)
		offersSvc := offers.NewService(offersRepo, hotReadCache)
		offersHandler = offers.NewHandler(offersSvc, cfg)

		// Initialize analytics service
		analyticsRepo := analytics.NewRepository(pool)
		analyticsSvc := analytics.NewService(analyticsRepo)
		analyticsHandler = analytics.NewHandler(analyticsSvc, cfg)

		// Initialize HR service
		hrRepo := hr.NewRepository(pool)
		hrSvc := hr.NewService(hrRepo)
		hrHandler = hr.NewHandler(hrSvc, cfg)

		// Initialize reservation service
		reservationRepo := reservation.NewRepository(pool)
		reservationSvc := reservation.NewService(reservationRepo)
		reservationHandler = reservation.NewHandler(reservationSvc, cfg)

		// Initialize search service
		searchRepo := search.NewRepository(pool)
		searchSvc := search.NewService(searchRepo)
		searchHandler = search.NewHandler(searchSvc, cfg)

		// Initialize chat service
		chatRepo := chat.NewRepository(pool)
		chatSvc := chat.NewService(chatRepo, pool)
		chatHandler = chat.NewHandler(chatSvc, cfg)

		// Initialize invoice service
		invoiceRepo := invoice.NewRepository(pool)
		invoiceSvc := invoice.NewService(invoiceRepo)
		invoiceHandler = invoice.NewHandler(invoiceSvc, cfg)

		// Initialize accounting service
		accountingRepo := accounting.NewRepository(pool)
		accountingSvc := accounting.NewService(accountingRepo)
		accountingHandler = accounting.NewHandler(accountingSvc, cfg)

		// Initialize support service
		supportRepo := support.NewRepository(pool)
		supportSvc := support.NewService(supportRepo)
		supportHandler = support.NewHandler(supportSvc, cfg)

	// Compliance domains
	consentRepo := consent.NewRepository(pool)
	consentSvc := consent.NewService(consentRepo)
	consentHandler = consent.NewHandler(consentSvc, cfg)

	dsrRepo := dsr.NewRepository(pool)
	dsrSvc := dsr.NewService(dsrRepo)
	dsrHandler = dsr.NewHandler(dsrSvc, cfg)

	breachRepo := breach.NewRepository(pool)
	breachSvc := breach.NewService(breachRepo)
	breachHandler = breach.NewHandler(breachSvc, cfg)

	reportsRepo := reports.NewRepository(pool)
	reportsSvc := reports.NewService(reportsRepo)
	reportsHandler = reports.NewHandler(reportsSvc, cfg)

	// Initialize customers service
		customersRepo := customers.NewRepository(pool)
		customersSvc := customers.NewService(customersRepo)
		customersHandler = customers.NewHandler(customersSvc, cfg)

		// Initialize gallery service
		galleryRepo := gallery.NewRepository(pool)
		gallerySvc := gallery.NewService(galleryRepo)
		galleryHandler = gallery.NewHandler(gallerySvc, cfg)

		// Initialize feedback service
		feedbackRepo := feedback.NewRepository(pool)
		feedbackSvc := feedback.NewService(feedbackRepo)
		feedbackHandler = feedback.NewHandler(feedbackSvc, cfg)

		publicInboxRepo := publicinbox.NewRepository(pool)
		publicInboxSvc := publicinbox.NewService(publicInboxRepo, log)
		publicInboxHandler = publicinbox.NewHandler(publicInboxSvc, cfg)

		// Initialize reviews service
		reviewsRepo := reviews.NewRepository(pool)
		reviewsSvc := reviews.NewService(reviewsRepo)
		reviewsHandler = reviews.NewHandler(reviewsSvc, cfg)

		// Initialize seasonal offers service
		seasonalOffersRepo := seasonaloffers.NewRepository(pool)
		seasonalOffersSvc := seasonaloffers.NewService(seasonalOffersRepo, hotReadCache)
		seasonalOffersHandler = seasonaloffers.NewHandler(seasonalOffersSvc, cfg)

		// Initialize map service
		mapRepo := mapdomain.NewRepository(pool)
		mapSvc := mapdomain.NewService(mapRepo)
		mapHandler = mapdomain.NewHandler(mapSvc, cfg)

		// Initialize bookings service
		bookingsRepo := bookings.NewRepository(pool)
		bookingsSvc := bookings.NewService(bookingsRepo, compressionService)
		bookingsHandler = bookings.NewHandler(bookingsSvc, cfg)

		// Initialize cart-event service
		cartEventRepo := cartevent.NewRepository(pool)
		cartEventSvc := cartevent.NewService(cartEventRepo)
		cartEventHandler = cartevent.NewHandler(cartEventSvc, cfg)

		// Initialize measurement service
		measurementRepo := measurement.NewRepository(pool)
		measurementSvc := measurement.NewService(measurementRepo)
		measurementHandler = measurement.NewHandler(measurementSvc, cfg)

		// Initialize apps service
		appsRepo := apps.NewRepository(pool)
		appsSvc := apps.NewService(appsRepo)
		appsHandler = apps.NewHandler(appsSvc, cfg)

		// Initialize shop-image-map service
		shopImageMapRepo := shopimagemap.NewRepository(pool)
		shopImageMapSvc := shopimagemap.NewService(shopImageMapRepo, compressionService)
		shopImageMapHandler = shopimagemap.NewHandler(shopImageMapSvc, cfg)

		// Initialize portal service
		portalRepo := portal.NewRepository(pool)
		disableOtp := cfg.App.Env == "development"
		portalSvc := portal.NewService(portalRepo, cfg.Auth.JWTSecret, disableOtp, !cfg.IsProduction())
		portalHandler = portal.NewHandler(portalSvc, cfg)

		// Initialize dashboard service (computed analytics, entity CRUD, finance reports).
		dashboardHandler = dashboard.NewHandler(pool, cfg)

		// Initialize POS shifts service.
		posRepo := pos.NewRepository(pool)
		posHandler = pos.NewHandler(posRepo, cfg)

		// Initialize product-categories service.
		productCategoriesRepo := productcategories.NewRepository(pool)
		productCategoriesSvc := productcategories.NewService(productCategoriesRepo)
		productCategoriesHandler = productcategories.NewHandler(productCategoriesSvc, cfg)

		// Initialize finance service (accounts, journal, expenses, taxes, wallets, transactions, reports).
		financeRepo := finance.NewRepository(pool)
		financeSvc := finance.NewService(financeRepo)
		financeHandler = finance.NewHandler(financeSvc, cfg)

		// Initialize subscriptions service (plans + member subscriptions).
		subscriptionsRepo := subscriptions.NewRepository(pool)
		subscriptionsSvc := subscriptions.NewService(subscriptionsRepo)
		subscriptionsHandler = subscriptions.NewHandler(subscriptionsSvc, cfg)

		if err := authSvc.SeedTestUsers(context.Background()); err != nil {
			log.Warn("failed to seed test users", zap.Error(err))
		}
	}

	// Fiber app with custom error handling.
	appCfg := fiber.Config{
		AppName:               cfg.App.Name,
		DisableStartupMessage: cfg.IsProduction(),
		ErrorHandler:          middleware.NewErrorHandler(),
		BodyLimit:             parseBodyLimit(cfg.HTTP.BodyLimit),
		ReadTimeout:           cfg.HTTP.ReadTimeout,
		WriteTimeout:          cfg.HTTP.WriteTimeout,
		IdleTimeout:           cfg.HTTP.IdleTimeout,
		ProxyHeader:           fiber.HeaderXForwardedFor,
	}
	if cfg.IsProduction() {
		appCfg.TrustedProxies = cfg.HTTP.TrustedProxies
	}

	f := fiber.New(appCfg)

	a := &App{
		StartedAt:             time.Now().UTC(),
		Config:                cfg,
		Fiber:                 f,
		DB:                    pool,
		Redis:                 redisClient,
		Jobs:                  jobsClient,
		Metrics:               metrics,
		Logger:                log,
		auditHandler:          auditHandler,
		authHandler:           authHandler,
		usersHandler:          usersHandler,
		shopsHandler:          shopsHandler,
		productsHandler:       productsHandler,
		ordersHandler:         ordersHandler,
		mediaHandler:          mediaHandler,
		offersHandler:         offersHandler,
		notificationHandler:   notificationHandler,
		analyticsHandler:      analyticsHandler,
		hrHandler:             hrHandler,
		reservationHandler:    reservationHandler,
		searchHandler:         searchHandler,
		chatHandler:           chatHandler,
		invoiceHandler:        invoiceHandler,
		accountingHandler:     accountingHandler,
		supportHandler:        supportHandler,
		customersHandler:      customersHandler,
		galleryHandler:        galleryHandler,
		feedbackHandler:       feedbackHandler,
		publicInboxHandler:    publicInboxHandler,
		reviewsHandler:        reviewsHandler,
		seasonalOffersHandler: seasonalOffersHandler,
		mapHandler:            mapHandler,
		builderHandler:        builderHandler,
		bookingsHandler:       bookingsHandler,
		cartEventHandler:      cartEventHandler,
		measurementHandler:    measurementHandler,
		appsHandler:           appsHandler,
		shopImageMapHandler:   shopImageMapHandler,
		portalHandler:         portalHandler,
		financeHandler:        financeHandler,
		dashboardHandler:      dashboardHandler,
		posHandler:            posHandler,
		productCategoriesHandler: productCategoriesHandler,
		consentHandler:        consentHandler,
		dsrHandler:            dsrHandler,
		breachHandler:         breachHandler,
		reportsHandler:        reportsHandler,
		subscriptionsHandler:   subscriptionsHandler,
		compressionService:    compressionService,
	}

	a.registerMiddleware(cfg, rateLimiter, idempotencyStore)
	a.registerRoutes()

	return a, nil
}

func (a *App) registerMiddleware(cfg *config.Config, rateLimiter *middleware.RateLimiter, idempotency *middleware.IdempotencyStore) {
	// Order matters. Recovery first so panics in any middleware are caught.
	a.Fiber.Use(middleware.Recovery())
	a.Fiber.Use(middleware.RequestID())
	a.Fiber.Use(middleware.Logger("/monitoring/health", "/monitoring/live", "/monitoring/ready"))
	a.Fiber.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))
	a.Fiber.Use(middleware.SecurityHeaders(cfg))
	a.Fiber.Use(middleware.CORS(cfg))

	// Slow-down middleware gently throttles excessive clients instead of
	// hard-failing them. Default: after 60 requests/min, add 200ms per excess
	// request up to a 4s max delay.
	slowDown := middleware.NewSlowDown(middleware.SlowDownOptions{
		WindowMs:   1 * time.Minute,
		DelayAfter: 60,
		DelayMs:    200 * time.Millisecond,
		MaxDelayMs: 4 * time.Second,
	})
	a.Fiber.Use(slowDown.Middleware())

	// Circuit breaker protects the service from cascading failures when too
	// many 5xx responses occur. Default: 5 failures, 30s reset, 3 half-open tries.
	circuitBreaker := middleware.NewCircuitBreaker()
	a.Fiber.Use(circuitBreaker.Middleware())

	if rateLimiter != nil {
		a.Fiber.Use(rateLimiter.Global())
	}

	a.Fiber.Use(middleware.AdminIPAllowlist(cfg))

	a.Fiber.Use(idempotency.Middleware())
	a.Fiber.Use(middleware.CSRF(cfg))

	if rateLimiter != nil {
		a.Fiber.Use(rateLimiter.Auth())
	}

	if a.Metrics != nil {
		a.Fiber.Use(a.Metrics.FiberMiddleware())
	}
}

func (a *App) registerRoutes() {
	// Monitoring routes (outside the /api/v1 prefix).
	h := health.NewHandler(a.DB, a.Redis, a.Logger)
	h.RegisterRoutes(a.Fiber)

	// Prometheus metrics endpoint. In production this is guarded: a
	// METRICS_TOKEN bearer token wins, otherwise the admin IP allowlist
	// applies, otherwise the endpoint is disabled so internal telemetry
	// (route labels, Go runtime stats) never leaks to the public internet.
	if a.Config.IsProduction() {
		a.Fiber.Get("/metrics", a.metricsHandler())
	} else {
		a.Fiber.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
	}

	// API v1 group.
	api := a.Fiber.Group("/api/v1")

	// Auth domain routes.
	if a.authHandler != nil {
		a.authHandler.RegisterRoutes(api)
	}

	// Audit domain routes.
	if a.auditHandler != nil {
		a.auditHandler.RegisterRoutes(api)
	}

	// Users domain routes.
	if a.usersHandler != nil {
		a.usersHandler.RegisterRoutes(api)
	}

	// Builder public storefront routes MUST be registered before the shops
	// domain: Fiber matches routes in registration order, and /shops/:slug
	// would otherwise swallow /shops/published-slugs (and /shops/:slug/website
	// could be shadowed by other shops sub-routes).
	if a.builderHandler != nil {
		a.builderHandler.RegisterPublicRoutes(api)
	}

	// Shops domain routes.
	if a.shopsHandler != nil {
		a.shopsHandler.RegisterRoutes(api)
	}

	// Products domain routes.
	if a.productsHandler != nil {
		a.productsHandler.RegisterRoutes(api)

		// Builder domain routes (auth required — owner/admin gated inside handlers).
		if a.builderHandler != nil {
			a.builderHandler.RegisterBuilderRoutes(api, middleware.RequireAuth(a.Config))
		}
	}

	// Orders domain routes.
	if a.ordersHandler != nil {
		a.ordersHandler.RegisterRoutes(api)
	}

	// Media domain routes.
	if a.mediaHandler != nil {
		a.mediaHandler.RegisterRoutes(api)
	}

	// Offers domain routes.
	if a.offersHandler != nil {
		a.offersHandler.RegisterRoutes(api)
	}

	// Notification domain routes.
	if a.notificationHandler != nil {
		a.notificationHandler.RegisterRoutes(api)
	}

	// Analytics domain routes.
	if a.analyticsHandler != nil {
		a.analyticsHandler.RegisterRoutes(api)
	}

	// HR domain routes.
	if a.hrHandler != nil {
		a.hrHandler.RegisterRoutes(api)
	}

	// Reservation domain routes.
	if a.reservationHandler != nil {
		a.reservationHandler.RegisterRoutes(api)
	}

	// Search domain routes.
	if a.searchHandler != nil {
		a.searchHandler.RegisterRoutes(api)
	}

	// Chat domain routes.
	if a.chatHandler != nil {
		a.chatHandler.RegisterRoutes(api)
	}

	// Invoice domain routes.
	if a.invoiceHandler != nil {
		a.invoiceHandler.RegisterRoutes(api)
	}

	// Accounting domain routes (double-entry ledger).
	if a.accountingHandler != nil {
		a.accountingHandler.RegisterRoutes(api)
	}

	// Support domain routes.
	if a.supportHandler != nil {
		a.supportHandler.RegisterRoutes(api)
	}
	if a.consentHandler != nil {
		a.consentHandler.RegisterRoutes(api)
	}
	if a.dsrHandler != nil {
		a.dsrHandler.RegisterRoutes(api)
	}
	if a.breachHandler != nil {
		a.breachHandler.RegisterRoutes(api)
	}
	if a.reportsHandler != nil {
		a.reportsHandler.RegisterRoutes(api)
	}

	// Customers domain routes.
	if a.customersHandler != nil {
		a.customersHandler.RegisterRoutes(api)
	}

	// Gallery domain routes.
	if a.galleryHandler != nil {
		a.galleryHandler.RegisterRoutes(api)
	}

	// Feedback domain routes.
	if a.feedbackHandler != nil {
		a.feedbackHandler.RegisterRoutes(api)
	}

	// Public inbox: contact + suggestions (public submit, admin inbox).
	if a.publicInboxHandler != nil {
		a.publicInboxHandler.RegisterRoutes(api)
	}

	// Reviews domain routes (product + shop reviews).
	if a.reviewsHandler != nil {
		a.reviewsHandler.RegisterProductRoutes(api)
		a.reviewsHandler.RegisterShopRoutes(api)
	}

	// Seasonal offers domain routes.
	if a.seasonalOffersHandler != nil {
		a.seasonalOffersHandler.RegisterRoutes(api)
	}

	// Map domain routes.
	if a.mapHandler != nil {
		a.mapHandler.RegisterRoutes(api)
	}

	// Bookings domain routes.
	if a.bookingsHandler != nil {
		a.bookingsHandler.RegisterRoutes(api)
	}

	// Cart-event domain routes.
	if a.cartEventHandler != nil {
		a.cartEventHandler.RegisterRoutes(api)
	}

	// Measurement domain routes.
	if a.measurementHandler != nil {
		a.measurementHandler.RegisterRoutes(api)
	}

	// Apps domain routes.
	if a.appsHandler != nil {
		a.appsHandler.RegisterRoutes(api)
	}

	// Shop image map domain routes.
	if a.shopImageMapHandler != nil {
		a.shopImageMapHandler.RegisterRoutes(api)
	}

	// Portal domain routes.
	if a.portalHandler != nil {
		a.portalHandler.RegisterRoutes(api)
	}

	// Dashboard domain routes (computed analytics, entity CRUD, finance reports).
	if a.dashboardHandler != nil {
		a.dashboardHandler.RegisterRoutes(api)
	}

	// POS domain routes (shift management).
	if a.posHandler != nil {
		a.posHandler.RegisterRoutes(api)
	}

	// Product-categories domain routes.
	if a.productCategoriesHandler != nil {
		a.productCategoriesHandler.RegisterRoutes(api)
	}

	// Finance domain routes (accounts, journal, expenses, taxes, wallets, reports).
	if a.financeHandler != nil {
		a.financeHandler.RegisterRoutes(api)
	}

	// Subscriptions domain routes (plans + member subscriptions).
	if a.subscriptionsHandler != nil {
		a.subscriptionsHandler.RegisterRoutes(api)
	}

	api.Get("/status", a.statusHandler)
}

// metricsHandler guards the Prometheus endpoint in production: a METRICS_TOKEN
// bearer token wins, otherwise the admin IP allowlist applies, otherwise the
// endpoint answers 404 so internal telemetry never leaks publicly.
func (a *App) metricsHandler() fiber.Handler {
	prom := adaptor.HTTPHandler(promhttp.Handler())
	return func(c *fiber.Ctx) error {
		token := strings.TrimSpace(a.Config.Security.MetricsToken)
		if token != "" {
			provided := strings.TrimSpace(strings.TrimPrefix(c.Get("Authorization"), "Bearer "))
			if provided != "" && subtle.ConstantTimeCompare([]byte(provided), []byte(token)) == 1 {
				return prom(c)
			}
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"success": false, "error": "forbidden"})
		}
		if middleware.ClientIPAllowed(a.Config, c.IP()) {
			return prom(c)
		}
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "error": "not_found"})
	}
}

func (a *App) statusHandler(c *fiber.Ctx) error {
	modules := fiber.Map{
		"analytics":      a.analyticsHandler != nil,
		"apps":           a.appsHandler != nil,
		"auth":           a.authHandler != nil,
		"bookings":       a.bookingsHandler != nil,
		"cartEvents":     a.cartEventHandler != nil,
		"chat":           a.chatHandler != nil,
		"customers":      a.customersHandler != nil,
		"dashboard":       a.dashboardHandler != nil,
		"feedback":       a.feedbackHandler != nil,
		"finance":         a.financeHandler != nil,
		"gallery":        a.galleryHandler != nil,
		"hr":             a.hrHandler != nil,
		"invoice":        a.invoiceHandler != nil,
		"accounting":     a.accountingHandler != nil,
		"map":            a.mapHandler != nil,
		"media":          a.mediaHandler != nil,
		"measurement":    a.measurementHandler != nil,
		"notification":   a.notificationHandler != nil,
		"offers":         a.offersHandler != nil,
		"orders":         a.ordersHandler != nil,
		"portal":         a.portalHandler != nil,
		"pos":            a.posHandler != nil,
		"productCategories": a.productCategoriesHandler != nil,
		"products":       a.productsHandler != nil,
		"reservation":    a.reservationHandler != nil,
		"reviews":        a.reviewsHandler != nil,
		"search":         a.searchHandler != nil,
		"seasonalOffers": a.seasonalOffersHandler != nil,
		"shopBuilder":    a.builderHandler != nil,
		"shopImageMap":   a.shopImageMapHandler != nil,
		"shops":          a.shopsHandler != nil,
		"support":        a.supportHandler != nil,
		"consent":        a.consentHandler != nil,
		"dsr":            a.dsrHandler != nil,
		"breach":         a.breachHandler != nil,
		"reports":        a.reportsHandler != nil,
		"users":          a.usersHandler != nil,
	}

	return c.JSON(fiber.Map{
		"success":       true,
		"message":       "Ray Go backend is running",
		"version":       a.Config.App.Version,
		"env":           a.Config.App.Env,
		"uptimeSeconds": int64(time.Since(a.StartedAt).Seconds()),
		"dependencies": fiber.Map{
			"database": a.DB != nil,
			"redis":    a.Redis != nil,
			"jobs":     a.Jobs != nil,
		},
		"modules": modules,
	})
}

// Listen starts the Fiber server and blocks until shutdown.
func (a *App) Listen() error {
	a.Logger.Info("starting http server",
		zap.String("addr", a.Config.Addr()),
		zap.String("env", a.Config.App.Env),
	)
	return a.Fiber.Listen(a.Config.Addr())
}

// Shutdown gracefully stops the server and releases resources.
func (a *App) Shutdown(ctx context.Context) error {
	a.Logger.Info("shutting down server")
	if err := a.Fiber.ShutdownWithContext(ctx); err != nil {
		a.Logger.Error("fiber shutdown error", zap.Error(err))
	}
	if a.Redis != nil {
		_ = a.Redis.Close()
	}
	if a.Jobs != nil {
		_ = a.Jobs.Close()
	}
	if a.DB != nil {
		a.DB.Close()
	}
	_ = a.Logger.Sync()
	return nil
}

// WaitForShutdown blocks until an OS signal is received, then gracefully shuts
// down the application.
func (a *App) WaitForShutdown() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), a.Config.HTTP.ShutdownTimeout)
	defer cancel()
	_ = a.Shutdown(ctx)
}

func parseBodyLimit(limit string) int {
	// Fiber expects bytes; for simplicity we accept a numeric string with optional
	// K/M suffix. "10M" -> ~10MB.
	var multiplier int64 = 1
	trimmed := limit
	switch {
	case len(limit) > 1 && (limit[len(limit)-1] == 'M' || limit[len(limit)-1] == 'm'):
		multiplier = 1024 * 1024
		trimmed = limit[:len(limit)-1]
	case len(limit) > 1 && (limit[len(limit)-1] == 'K' || limit[len(limit)-1] == 'k'):
		multiplier = 1024
		trimmed = limit[:len(limit)-1]
	}
	var value int
	if _, err := fmt.Sscanf(trimmed, "%d", &value); err != nil || value <= 0 {
		return 10 * 1024 * 1024 // 10MB fallback
	}
	return value * int(multiplier)
}




