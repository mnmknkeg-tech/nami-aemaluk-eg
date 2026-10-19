package storage

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client wraps an S3-compatible client for uploads and presigned URLs.
type S3Client struct {
	cfg           config.S3Config
	client        *s3.Client
	presignClient *s3.PresignClient
}

// NewS3Client creates an S3 client from configuration.
func NewS3Client(cfg config.S3Config) (*S3Client, error) {
	if cfg.Bucket == "" {
		return nil, fmt.Errorf("s3 bucket is required")
	}

	resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...any) (aws.Endpoint, error) {
		if cfg.Endpoint != "" {
			return aws.Endpoint{
				URL:               cfg.Endpoint,
				HostnameImmutable: true,
				Source:            aws.EndpointSourceCustom,
			}, nil
		}
		return aws.Endpoint{}, fmt.Errorf("no endpoint configured")
	})

	optFns := []func(*awsConfig.LoadOptions) error{
		awsConfig.WithRegion(cfg.Region),
		awsConfig.WithEndpointResolverWithOptions(resolver),
	}

	if cfg.AccessKeyID != "" && cfg.SecretAccessKey != "" {
		optFns = append(optFns, awsConfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		))
	}

	awsCfg, err := awsConfig.LoadDefaultConfig(context.Background(), optFns...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &S3Client{
		cfg:           cfg,
		client:        client,
		presignClient: s3.NewPresignClient(client),
	}, nil
}

// PresignUpload returns a PUT URL for uploading an object directly to S3/R2.
func (c *S3Client) PresignUpload(ctx context.Context, key, contentType string, expires time.Duration) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(c.cfg.Bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}
	req, err := c.presignClient.PresignPutObject(ctx, input, s3.WithPresignExpires(expires))
	if err != nil {
		return "", fmt.Errorf("presign upload: %w", err)
	}
	return req.URL, nil
}

// PublicURL returns the public URL for an object key.
func (c *S3Client) PublicURL(key string) string {
	base := strings.TrimSuffix(c.cfg.PublicBaseURL, "/")
	if base == "" {
		base = fmt.Sprintf("%s/%s", strings.TrimSuffix(c.cfg.Endpoint, "/"), c.cfg.Bucket)
	}
	return fmt.Sprintf("%s/%s", base, strings.TrimPrefix(key, "/"))
}

// MakeKey builds a sanitized S3 key for a shop media file.
func (c *S3Client) MakeKey(shopID, purpose, filename string) string {
	ext := path.Ext(filename)
	base := strings.TrimSuffix(path.Base(filename), ext)
	base = sanitizeKeyComponent(base)
	shopID = sanitizeKeyComponent(shopID)
	purpose = sanitizeKeyComponent(purpose)
	return fmt.Sprintf("shops/%s/%s/%d-%s%s", shopID, purpose, time.Now().UnixMilli(), base, ext)
}

func sanitizeKeyComponent(s string) string {
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' || r == '/' || r == '.' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	res := b.String()
	res = strings.Trim(res, "/.")
	if res == "" {
		return "file"
	}
	return res
}

// IsAllowedContentType validates an allowed image/video mime type.
func IsAllowedContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	// SVG is rejected explicitly: it can carry <script> payloads and is stored
	// as-is (never re-encoded), so allowing it would enable stored XSS wherever
	// uploads are served inline.
	if ct == "image/svg+xml" {
		return false
	}
	allowed := []string{
		"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
		"video/mp4", "video/webm", "video/quicktime",
		"model/gltf+json", "model/gltf-binary",
	}
	for _, a := range allowed {
		if ct == a {
			return true
		}
	}
	// Allow types with prefix. The explicit svg rejection above must stay
	// ahead of this prefix match ("image/svg+xml" starts with "image/").
	if strings.HasPrefix(ct, "image/") || strings.HasPrefix(ct, "video/") {
		return true
	}
	return false
}

// ParseContentTypeFromFilename returns a mime type based on extension.
func ParseContentTypeFromFilename(name string) string {
	ext := strings.ToLower(path.Ext(name))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".avif":
		return "image/avif"
	case ".gif":
		return "image/gif"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mov":
		return "video/quicktime"
	}
	return "application/octet-stream"
}

// IsValidPublicURL checks whether a URL is from the configured public base.
func (c *S3Client) IsValidPublicURL(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil {
		return false
	}
	base, err := url.Parse(c.cfg.PublicBaseURL)
	if err != nil || base.Host == "" {
		return true // No public base configured; accept any URL.
	}
	return u.Host == base.Host
}
