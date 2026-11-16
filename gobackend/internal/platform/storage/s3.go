package storage

import (
        "bytes"
        "context"
        "fmt"
        "io"
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

// HeadObject verifies stored metadata before a presigned upload is registered.
func (c *S3Client) HeadObject(ctx context.Context, key string) (*s3.HeadObjectOutput, error) {
        out, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
                Bucket: aws.String(c.cfg.Bucket),
                Key:    aws.String(key),
        })
        if err != nil {
                return nil, fmt.Errorf("head object: %w", err)
        }
        return out, nil
}

// ReadObjectPrefix reads only the leading bytes needed to verify an uploaded
// image signature without downloading the full object into application memory.
func (c *S3Client) ReadObjectPrefix(ctx context.Context, key string, limit int64) ([]byte, error) {
        if limit <= 0 || limit > 4096 {
                limit = 512
        }
        out, err := c.client.GetObject(ctx, &s3.GetObjectInput{
                Bucket: aws.String(c.cfg.Bucket),
                Key:    aws.String(key),
                Range:  aws.String(fmt.Sprintf("bytes=0-%d", limit-1)),
        })
        if err != nil {
                return nil, fmt.Errorf("get object prefix: %w", err)
        }
        defer out.Body.Close()
        prefix, err := io.ReadAll(io.LimitReader(out.Body, limit))
        if err != nil {
                return nil, fmt.Errorf("read object prefix: %w", err)
        }
        return prefix, nil
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
                if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
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

// IsCompatibleContentType ensures the declared MIME type matches the filename
// extension instead of trusting a caller-controlled Content-Type header.
func IsCompatibleContentType(filename, contentType string) bool {
        return ParseContentTypeFromFilename(filename) == strings.ToLower(strings.TrimSpace(contentType))
}

// IsAllowedContentType accepts only formats with an explicit storage and
// serving policy. Keep this an exact allowlist. Prefix matching would admit
// unreviewed formats (for example image/heic or video/x-custom) that have no
// matching extension/signature validation in the media pipeline.
func IsAllowedContentType(ct string) bool {
        ct = strings.ToLower(strings.TrimSpace(ct))
        switch ct {
        case "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
                "video/mp4", "video/webm", "video/quicktime",
                "model/gltf+json", "model/gltf-binary":
                return true
        default:
                return false
        }
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
        case ".gltf":
                return "model/gltf+json"
        case ".glb":
                return "model/gltf-binary"
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
        if key == "" || strings.HasPrefix(key, "/") || strings.ContainsAny(key, "\\\x00") {
                return fmt.Errorf("invalid key")
        }
        for _, part := range strings.Split(key, "/") {
                if part == "" || part == "." || part == ".." {
                        return fmt.Errorf("invalid key: unsafe path segment")
                }
        }
        return nil
}


// ValidateShopKey ensures an uploaded key belongs to the authenticated shop
// and purpose, not merely to the shared storage bucket.
func (c *S3Client) ValidateShopKey(key, shopID, purpose string) error {
        if err := c.ValidateKey(key); err != nil {
                return err
        }
        if shopID == "" || purpose == "" {
                return fmt.Errorf("shop and purpose are required")
        }
        prefix := fmt.Sprintf("shops/%s/%s/", sanitizeKeyComponent(shopID), sanitizeKeyComponent(purpose))
        if !strings.HasPrefix(key, prefix) {
                return fmt.Errorf("object key does not belong to requested shop and purpose")
        }
        name := strings.TrimPrefix(key, prefix)
        if name == "" || strings.Contains(name, "/") {
                return fmt.Errorf("invalid object key layout")
        }
        return nil
}
