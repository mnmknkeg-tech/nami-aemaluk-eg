package logger

import (
	"context"
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// requestIDKey is the key used to store/retrieve request IDs from context.
type requestIDKey struct{}

// RequestIDContextKey returns the key used to identify request IDs in context.
// It is exported so middleware packages can access the same key.
func RequestIDContextKey() any {
	return requestIDKey{}
}

var (
	global *zap.Logger
	once   sync.Once
)

// New creates a production or development logger based on the environment.
func New(level, format, env string) (*zap.Logger, error) {
	atomicLevel := zap.NewAtomicLevel()
	if err := atomicLevel.UnmarshalText([]byte(level)); err != nil {
		atomicLevel.SetLevel(zap.InfoLevel)
	}

	var encoder zapcore.Encoder
	if format == "console" || env == "development" {
		encoder = zapcore.NewConsoleEncoder(zap.NewDevelopmentEncoderConfig())
	} else {
		cfg := zap.NewProductionEncoderConfig()
		cfg.TimeKey = "timestamp"
		cfg.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewJSONEncoder(cfg)
	}

	core := zapcore.NewCore(encoder, zapcore.Lock(os.Stdout), atomicLevel)
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))
	if env == "development" {
		logger = zap.New(core, zap.Development(), zap.AddCaller())
	}

	return logger, nil
}

// SetGlobal stores a logger as the package-level default.
func SetGlobal(l *zap.Logger) {
	once.Do(func() {
		global = l
	})
}

// Global returns the default logger. If none has been set it returns a no-op
// logger so callers can always use it safely.
func Global() *zap.Logger {
	if global == nil {
		return zap.NewNop()
	}
	return global
}

// WithRequestID returns a logger enriched with the request id stored in ctx.
func WithRequestID(ctx context.Context) *zap.Logger {
	id, ok := ctx.Value(requestIDKey{}).(string)
	if !ok || id == "" {
		return Global()
	}
	return Global().With(zap.String("request_id", id))
}

// SetRequestID stores the request id in the context.
func SetRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}
