package errors

import (
	"errors"
	"fmt"
)

// Kind describes the class of an application error. It is used by the HTTP
// adapter to pick the correct status code.
type Kind string

const (
	KindUnknown            Kind = "unknown"
	KindValidation         Kind = "validation"
	KindAuthentication     Kind = "authentication"
	KindAuthorization      Kind = "authorization"
	KindNotFound           Kind = "not_found"
	KindConflict           Kind = "conflict"
	KindInternal           Kind = "internal"
	KindRateLimit          Kind = "rate_limit"
	KindServiceUnavailable Kind = "service_unavailable"
)

// AppError is a domain error that carries both a user-facing message and a
// machine-readable kind/code.
type AppError struct {
	Kind    Kind
	Code    string
	Message string
	Err     error
	Fields  map[string]any
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s:%s] %s: %v", e.Kind, e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s:%s] %s", e.Kind, e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// New creates a new application error.
func New(kind Kind, code, message string) *AppError {
	return &AppError{Kind: kind, Code: code, Message: message}
}

// Wrap wraps an underlying error while keeping the application semantics.
func Wrap(kind Kind, code, message string, err error) *AppError {
	return &AppError{Kind: kind, Code: code, Message: message, Err: err}
}

// WithField attaches structured context to the error for logging/validation.
func (e *AppError) WithField(key string, value any) *AppError {
	if e.Fields == nil {
		e.Fields = make(map[string]any)
	}
	e.Fields[key] = value
	return e
}

// Helpers for the most common error kinds.

func Validation(code, message string) *AppError {
	return New(KindValidation, code, message)
}

func NotFound(resource, identifier string) *AppError {
	return New(KindNotFound, "not_found", resource+" not found").
		WithField("resource", resource).
		WithField("identifier", identifier)
}

func Unauthorized(code, message string) *AppError {
	return New(KindAuthentication, code, message)
}

func Forbidden(code, message string) *AppError {
	return New(KindAuthorization, code, message)
}

func Conflict(code, message string) *AppError {
	return New(KindConflict, code, message)
}

func Internal(code string, err error) *AppError {
	return Wrap(KindInternal, code, "internal server error", err)
}

func RateLimit(message string) *AppError {
	return New(KindRateLimit, "rate_limit_exceeded", message)
}

// IsAppError reports whether err is an *AppError.
func IsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
