package storage

import (
	"bytes"
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

	region := cfg.Region
	if region == "" || (cfg.Endpoint == "" && region == "auto") {
		region = "us-east-1"
	}

	optFns := []func(*awsConfig.LoadOptions) error{
		awsConfig.WithRegion(region),
	}

	if cfg.Endpoint != "" {
		resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...any) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               cfg.Endpoint,
				HostnameImmutable: true,
				Source:            aws.EndpointSourceCustom,
			}, nil
		})
		optFns = append(optFns, awsConfig.WithEndpointResolverWithOptions(resolver))
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
		if cfg.Endpoint != "" {
			o.UsePathStyle = true
		}
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

// PutObject uploads an object body directly to S3/R2 and returns the public
// URL for the stored key. It backs the multipart /media/upload endpoint, which
// receives the file bytes in the request instead of having the browser PUT
// them to a presigned URL.
func (c *S3Client) PutObject(ctx context.Context, key, contentType string, body []byte) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(c.cfg.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(body),
		ContentType: aws.String(contentType),
	}
	if _, err := c.client.PutObject(ctx, input); err != nil {
		return "", fmt.Errorf("put object: %w", err)
	}
	return c.PublicURL(key), nil
}

// PublicURL returns the public URL for an object key.
func (c *S3Client) PublicURL(key string) string {
	base := strings.TrimSuffix(c.cfg.PublicBaseURL, "/")
	if base == "" {
		if c.cfg.Endpoint != "" {
			base = fmt.Sprintf("%s/%s", strings.TrimSuffix(c.cfg.Endpoint, "/"), c.cfg.Bucket)
		} else {
			region := c.cfg.Region
			if region == "" || region == "auto" {
				region = "us-east-1"
			}
			if region == "us-east-1" {
				base = fmt.Sprintf("https://%s.s3.amazonaws.com", c.cfg.Bucket)
			} else {
				base = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", c.cfg.Bucket, region)
			}
		}
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

// ValidateKey validates an S3 object key to prevent path traversal attacks.
func (c *S3Client) ValidateKey(key string) error {
	if key == "" {
		return fmt.Errorf("key is required")
	}
	// Reject keys with parent directory traversal patterns
	for _, part := range strings.Split(key, "/") {
		if part == ".." {
			return fmt.Errorf("invalid key: path traversal not allowed")
		}
	}
	// Reject keys with null bytes
	if strings.ContainsAny(key, "\x00") {
		return fmt.Errorf("invalid key: null bytes not allowed")
	}
	return nil
}
