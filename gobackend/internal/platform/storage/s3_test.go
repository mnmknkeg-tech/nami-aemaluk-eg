package storage

import (
	"testing"

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
