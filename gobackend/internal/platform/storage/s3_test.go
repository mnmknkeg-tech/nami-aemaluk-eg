package storage

import (
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/stretchr/testify/assert"
)

// SVG must never pass the allowlist: it can carry <script> payloads and is
// stored as-is, so serving it inline would enable stored XSS.
func TestIsAllowedContentType_RejectsSVG(t *testing.T) {
	cases := []string{
		"image/svg+xml",
		"IMAGE/SVG+XML",
		" image/svg+xml ",
	}
	for _, ct := range cases {
		assert.False(t, IsAllowedContentType(ct), "must reject %q", ct)
	}
}

func TestIsAllowedContentType_AllowedAndBlocked(t *testing.T) {
	allowed := []string{
		"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
		"video/mp4", "video/webm", "video/quicktime",
		"model/gltf+json", "model/gltf-binary",
		"image/heic", // prefix match
	}
	for _, ct := range allowed {
		assert.True(t, IsAllowedContentType(ct), "must allow %q", ct)
	}

	blocked := []string{
		"text/html",
		"application/javascript",
		"application/xhtml+xml",
		"application/pdf",
		"",
	}
	for _, ct := range blocked {
		assert.False(t, IsAllowedContentType(ct), "must reject %q", ct)
	}
}

func TestPublicURL(t *testing.T) {
	t.Run("Custom PublicBaseURL", func(t *testing.T) {
		client := &S3Client{
			cfg: config.S3Config{
				Bucket:        "my-bucket",
				PublicBaseURL: "https://cdn.example.com",
			},
		}
		url := client.PublicURL("shops/123/banner.jpg")
		assert.Equal(t, "https://cdn.example.com/shops/123/banner.jpg", url)
	})

	t.Run("Custom Endpoint (MinIO)", func(t *testing.T) {
		client := &S3Client{
			cfg: config.S3Config{
				Bucket:   "ray-media",
				Endpoint: "http://localhost:9000",
			},
		}
		url := client.PublicURL("shops/123/banner.jpg")
		assert.Equal(t, "http://localhost:9000/ray-media/shops/123/banner.jpg", url)
	})

	t.Run("AWS S3 standard region", func(t *testing.T) {
		client := &S3Client{
			cfg: config.S3Config{
				Bucket: "ray-media",
				Region: "eu-west-1",
			},
		}
		url := client.PublicURL("shops/123/banner.jpg")
		assert.Equal(t, "https://ray-media.s3.eu-west-1.amazonaws.com/shops/123/banner.jpg", url)
	})

	t.Run("AWS S3 us-east-1", func(t *testing.T) {
		client := &S3Client{
			cfg: config.S3Config{
				Bucket: "ray-media",
				Region: "us-east-1",
			},
		}
		url := client.PublicURL("shops/123/banner.jpg")
		assert.Equal(t, "https://ray-media.s3.amazonaws.com/shops/123/banner.jpg", url)
	})
}

func TestNewS3Client(t *testing.T) {
	t.Run("Requires bucket", func(t *testing.T) {
		_, err := NewS3Client(config.S3Config{})
		assert.Error(t, err)
	})

	t.Run("Initializes for AWS S3", func(t *testing.T) {
		client, err := NewS3Client(config.S3Config{
			Bucket: "ray-media",
			Region: "eu-west-1",
		})
		assert.NoError(t, err)
		assert.NotNil(t, client)
	})

	t.Run("Initializes for Custom Endpoint", func(t *testing.T) {
		client, err := NewS3Client(config.S3Config{
			Bucket:   "ray-media",
			Endpoint: "http://localhost:9000",
		})
		assert.NoError(t, err)
		assert.NotNil(t, client)
	})
}
