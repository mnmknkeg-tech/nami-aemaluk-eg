package mailer

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"
)

// SMTPConfig holds the connection details required by SMTPMailer.
type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
	FromName string
}

// SMTPMailer sends email through a standard SMTP server using the stdlib
// net/smtp package (PLAIN auth). It is intended to be called from the
// background worker so a slow/unavailable mail server never blocks a
// request goroutine.
type SMTPMailer struct {
	cfg SMTPConfig
}

// NewSMTPMailer creates a mailer backed by an SMTP server.
func NewSMTPMailer(cfg SMTPConfig) *SMTPMailer {
	return &SMTPMailer{cfg: cfg}
}

// Send implements Mailer.
func (m *SMTPMailer) Send(_ context.Context, msg Message) (Result, error) {
	if m.cfg.Host == "" {
		return Result{OK: false}, fmt.Errorf("smtp host not configured")
	}

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)

	from := m.cfg.From
	if m.cfg.FromName != "" {
		from = fmt.Sprintf("%s <%s>", m.cfg.FromName, m.cfg.From)
	}

	body := msg.Text
	contentType := "text/plain; charset=UTF-8"
	if msg.HTML != "" {
		body = msg.HTML
		contentType = "text/html; charset=UTF-8"
	}

	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", msg.To)
	fmt.Fprintf(&b, "Subject: %s\r\n", msg.Subject)
	b.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: %s\r\n", contentType)
	b.WriteString("\r\n")
	b.WriteString(body)

	var auth smtp.Auth
	if m.cfg.User != "" {
		auth = smtp.PlainAuth("", m.cfg.User, m.cfg.Password, m.cfg.Host)
	}

	if err := smtp.SendMail(addr, auth, m.cfg.From, []string{msg.To}, []byte(b.String())); err != nil {
		return Result{OK: false}, fmt.Errorf("smtp send failed: %w", err)
	}

	return Result{OK: true}, nil
}
