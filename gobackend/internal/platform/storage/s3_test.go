package storage

import (
	"strings"
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
		}
	for _, ct := range allowed {
		assert.True(t, IsAllowedContentType(ct), "must allow %q", ct)
	}

	blocked := []string{
		"text/html",
		"application/javascript",
		"application/xhtml+xml",
		"application/pdf",
		"image/heic",
		"image/x-custom",
		"video/x-custom",
		"image/svg+xml",
		"",
	}
	for _, ct := range blocked {
		assert.False(t, IsAllowedContentType(ct), "must reject %q", ct)
	}
}

func TestIsAllowedContentType_RejectsUnknownImageAndVideoTypes(t *testing.T) {
	assert.False(t, IsAllowedContentType("image/heic"))
	assert.False(t, IsAllowedContentType("image/x-unknown"))
	assert.False(t, IsAllowedContentType("video/x-unknown"))
}

func TestIsCompatibleContentType(t *testing.T) {
	assert.True(t, IsCompatibleContentType("photo.jpg", "image/jpeg"))
	assert.True(t, IsCompatibleContentType("photo.webp", "image/webp"))
	assert.True(t, IsCompatibleContentType("clip.mp4", "video/mp4"))
	assert.False(t, IsCompatibleContentType("photo.html", "image/jpeg"))
	assert.False(t, IsCompatibleContentType("photo.png", "image/jpeg"))
}

func TestValidateShopKey(t *testing.T) {
	client := &S3Client{}
	assert.NoError(t, client.ValidateShopKey("shops/shop-1/product_image/123-photo.webp", "shop-1", "product_image"))
	assert.Error(t, client.ValidateShopKey("shops/shop-2/product_image/123-photo.webp", "shop-1", "product_image"))
	assert.Error(t, client.ValidateShopKey("shops/shop-1/gallery/123-photo.webp", "shop-1", "product_image"))
	assert.Error(t, client.ValidateShopKey("shops/shop-1/product_image/../other.webp", "shop-1", "product_image"))
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


func TestMakeKeySanitizesPathComponents(t *testing.T) {
	client := &S3Client{}
	key := client.MakeKey("../shop/evil", "../../products", "../hero.photo.png")
	parts := strings.Split(key, "/")
	assert.Len(t, parts, 4, "object key must have exactly four path segments")
	assert.Equal(t, "shops", parts[0])
	for _, part := range parts {
		assert.NotContains(t, part, "..")
	}
	assert.True(t, strings.HasSuffix(parts[3], ".png"))
}
