package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/media"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/domains/notification"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/jobs"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/logger"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/mailer"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/redis"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/storage"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/workers"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config load failed: %v", err)
	}

	logr, err := logger.New(cfg.Log.Level, cfg.Log.Format, cfg.App.Env)
	if err != nil {
		log.Fatalf("logger init failed: %v", err)
	}
	logger.SetGlobal(logr)

	redisClient := redis.New(cfg.Redis, logr)

	var pool *db.Pool
	if cfg.DB.URL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		pool, err = db.New(ctx, cfg.DB, logr)
		cancel()
		if err != nil {
			logr.Fatal("database connection failed", zap.Error(err))
		}
	} else {
		logr.Fatal("DATABASE_URL is required to run the worker")
	}

	// Mailer: real SMTP when configured, otherwise emails are logged and dropped.
	appMailer := mailer.FromConfig(cfg)

	notificationRepo := notification.NewRepository(pool)
	webPushService := notification.NewWebPushService(
		cfg.External.VAPIDSubject,
		cfg.External.VAPIDPublicKey,
		cfg.External.VAPIDPrivateKey,
	)

	s3Client, err := storage.NewS3Client(cfg.S3)
	if err != nil {
		logr.Warn("s3 client not available", zap.Error(err))
		s3Client = nil
	}
	mediaRepo := media.NewRepository(pool)
	mediaSvc := media.NewService(cfg, mediaRepo, s3Client, nil, nil)

	server := asynq.NewServer(
		jobs.RedisConnOpt(cfg.Redis),
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				jobs.QueueCritical: 6,
				jobs.QueueDefault:  3,
				jobs.QueueLow:      1,
			},
		},
	)

	mux := asynq.NewServeMux()
	mux.Handle(jobs.TypeEmailSend, workers.NewEmailHandler(appMailer))
	mux.Handle(jobs.TypeNotificationPush, workers.NewNotificationPushHandler(notificationRepo, webPushService))
	mux.Handle(jobs.TypeImageOptimize, workers.NewImageOptimizeHandler(mediaSvc))

	logr.Info("starting asynq worker", zap.String("addr", cfg.Redis.Addr()))

	if err := server.Start(mux); err != nil {
		logr.Fatal("worker failed to start", zap.Error(err))
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logr.Info("shutting down worker")
	server.Stop()
	server.Shutdown()
	if pool != nil {
		pool.Close()
	}
	_ = redisClient.Close()
	_ = logr.Sync()
}
