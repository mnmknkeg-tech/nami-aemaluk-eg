package mailer

import (
	"context"
	"fmt"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
)

// Message represents an email to send.
type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

// Result reports whether the message was queued/sent.
type Result struct {
	OK bool
}

// Mailer abstracts email delivery.
type Mailer interface {
	Send(ctx context.Context, msg Message) (Result, error)
}

// NoOpMailer drops all emails. It is useful in development or when SMTP is not configured.
type NoOpMailer struct{}

func (NoOpMailer) Send(_ context.Context, _ Message) (Result, error) {
	fmt.Printf("[noop mailer] email not sent (SMTP not configured)\n")
	return Result{OK: false}, nil
}

// FromConfig picks the right mailer for the loaded configuration: a real SMTP
// mailer when an SMTP host is set, otherwise a no-op mailer. Used by both the
// API process and the worker bootstrap.
func FromConfig(cfg *config.Config) Mailer {
	if cfg.SMTP.Host == "" {
		return NoOpMailer{}
	}
	return NewSMTPMailer(SMTPConfig{
		Host:     cfg.SMTP.Host,
		Port:     cfg.SMTP.Port,
		User:     cfg.SMTP.User,
		Password: cfg.SMTP.Password,
		From:     cfg.SMTP.From,
		FromName: cfg.SMTP.FromName,
	})
}
