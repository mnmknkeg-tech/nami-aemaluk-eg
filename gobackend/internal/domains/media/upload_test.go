package media

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"math/rand"
	"testing"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/compression"
)

func newTestService(enabled bool) *Service {
	return &Service{compression: compression.NewService(compression.QualityHigh, enabled)}
}

// noisyPNG generates an incompressible PNG of the given dimensions — worst-case
// input for both PNG and JPEG encoders, mirroring real photos poorly but
// guaranteeing a large payload.
func noisyPNG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	rnd := rand.New(rand.NewSource(42))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{uint8(rnd.Intn(256)), uint8(rnd.Intn(256)), uint8(rnd.Intn(256)), 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("png.Encode: %v", err)
	}
	return buf.Bytes()
}

// noisyJPEG generates a JPEG at the given quality.
func noisyJPEG(t *testing.T, w, h, q int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	rnd := rand.New(rand.NewSource(7))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{uint8(rnd.Intn(256)), uint8(rnd.Intn(256)), uint8(rnd.Intn(256)), 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: q}); err != nil {
		t.Fatalf("jpeg.Encode: %v", err)
	}
	return buf.Bytes()
}

func decodeDims(t *testing.T, data []byte) (int, int) {
	t.Helper()
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("DecodeConfig: %v", err)
	}
	return cfg.Width, cfg.Height
}

func TestProcessUploadPayload_RecompressesLargePNG(t *testing.T) {
	s := newTestService(true)
	raw := noisyPNG(t, 2400, 2400)

	payload, outCT, outExt := s.processUploadPayload("image/png", ".png", raw)

	if len(payload) >= len(raw) {
		t.Fatalf("expected recompression to shrink payload: in=%d out=%d", len(raw), len(payload))
	}
	if outCT != "image/jpeg" {
		t.Fatalf("expected jpeg mime, got %s", outCT)
	}
	if outExt != ".jpg" {
		t.Fatalf("expected .jpg ext, got %s", outExt)
	}
	if got := payload[:2]; got[0] != 0xFF || got[1] != 0xD8 {
		t.Fatalf("payload is not a JPEG (magic %x)", got)
	}
	w, h := decodeDims(t, payload)
	if w > 1920 || h > 1920 {
		t.Fatalf("expected dimensions capped at 1920, got %dx%d", w, h)
	}
}

func TestProcessUploadPayload_RecompressesLargeJPEG(t *testing.T) {
	s := newTestService(true)
	raw := noisyJPEG(t, 2400, 2400, 100) // oversized, max quality

	payload, outCT, outExt := s.processUploadPayload("image/jpeg", ".jpeg", raw)

	if len(payload) >= len(raw) {
		t.Fatalf("expected recompression to shrink payload: in=%d out=%d", len(raw), len(payload))
	}
	if outCT != "image/jpeg" || outExt != ".jpg" {
		t.Fatalf("expected image/jpeg + .jpg, got %s + %s", outCT, outExt)
	}
	w, h := decodeDims(t, payload)
	if w > 1920 || h > 1920 {
		t.Fatalf("expected dimensions capped at 1920, got %dx%d", w, h)
	}
}

func TestProcessUploadPayload_PassesThroughSmallEfficientImages(t *testing.T) {
	s := newTestService(true)
	small := []byte("not-really-webp-but-small")

	for _, ct := range []string{"image/webp", "image/jpeg"} {
		payload, outCT, outExt := s.processUploadPayload(ct, ".x", small)
		if !bytes.Equal(payload, small) {
			t.Fatalf("%s: small efficient image must be stored byte-for-byte", ct)
		}
		if outCT != ct {
			t.Fatalf("%s: mime must be preserved, got %s", ct, outCT)
		}
		if outExt != ".x" {
			t.Fatalf("%s: ext must be preserved, got %s", ct, outExt)
		}
	}
}

func TestProcessUploadPayload_PassesThroughNonRaster(t *testing.T) {
	s := newTestService(true)
	big := bytes.Repeat([]byte("a"), 3<<20) // 3 MiB

	for _, ct := range []string{"image/gif", "image/svg+xml", "application/pdf", "video/mp4"} {
		payload, outCT, _ := s.processUploadPayload(ct, ".bin", big)
		if !bytes.Equal(payload, big) {
			t.Fatalf("%s: non-raster content must pass through untouched", ct)
		}
		if outCT != ct {
			t.Fatalf("%s: mime must be preserved, got %s", ct, outCT)
		}
	}
}

func TestProcessUploadPayload_CompressionFailureFallsBackToOriginal(t *testing.T) {
	s := newTestService(true)
	// Not a decodable image — Compress must fail and the original must survive.
	garbage := bytes.Repeat([]byte{0x00, 0xFF}, 1<<20)

	payload, outCT, outExt := s.processUploadPayload("image/png", ".png", garbage)

	if !bytes.Equal(payload, garbage) {
		t.Fatal("undecodable image must fall back to original bytes")
	}
	if outCT != "image/png" || outExt != ".png" {
		t.Fatalf("fallback must preserve mime/ext, got %s/%s", outCT, outExt)
	}
}

func TestProcessUploadPayload_DisabledOrNilCompression(t *testing.T) {
	raw := noisyPNG(t, 64, 64)

	disabled := newTestService(false)
	payload, outCT, outExt := disabled.processUploadPayload("image/png", ".png", raw)
	if !bytes.Equal(payload, raw) || outCT != "image/png" || outExt != ".png" {
		t.Fatal("disabled compression must pass through")
	}

	noService := &Service{} // compression == nil
	payload, _, _ = noService.processUploadPayload("image/png", ".png", raw)
	if !bytes.Equal(payload, raw) {
		t.Fatal("nil compression service must pass through")
	}
}

func TestCompressionService_ResizesOversizedImages(t *testing.T) {
	s := compression.NewService(compression.QualityHigh, true)
	raw := noisyPNG(t, 4000, 2000)

	res, err := s.Compress(raw, compression.QualityHigh)
	if err != nil {
		t.Fatalf("Compress: %v", err)
	}
	if res.Width > 1920 || res.Height > 1920 {
		t.Fatalf("expected Fit to cap dimensions, got %dx%d", res.Width, res.Height)
	}
	if len(res.Data) == 0 {
		t.Fatal("expected encoded output")
	}
	// Aspect ratio preserved: 4000x2000 → 1920x960.
	if res.Width != 1920 || res.Height != 960 {
		t.Fatalf("expected 1920x960, got %dx%d", res.Width, res.Height)
	}
}

func TestIsValidExt(t *testing.T) {
	valid := []string{".png", ".jpg", ".jpeg", ".webp", ".mp4"}
	// Active-content extensions are blocked even though they are syntactically
	// valid — a mismatched Content-Type header could otherwise smuggle them
	// onto disk under a benign declared type.
	invalid := []string{
		"", ".", ".too-long-extension", ".pn g", ".<script>",
		".svg", ".svgz", ".html", ".htm", ".xhtml", ".js", ".mjs", ".xml",
	}
	for _, e := range valid {
		if !isValidExt(e) {
			t.Errorf("expected %q to be valid", e)
		}
	}
	for _, e := range invalid {
		if isValidExt(e) {
			t.Errorf("expected %q to be invalid", e)
		}
	}
}


func TestIsValidImageSignature(t *testing.T) {
	cases := []struct {
		name string
		mime string
		data []byte
		want bool
	}{
		{"jpeg", "image/jpeg", []byte{0xff, 0xd8, 0xff, 0x00}, true},
		{"png", "image/png", []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}, true},
		{"gif", "image/gif", []byte("GIF89a-data"), true},
		{"webp", "image/webp", []byte("RIFFxxxxWEBP"), true},
		{"avif", "image/avif", []byte("xxxxftypavif"), true},
		{"spoofed png", "image/png", []byte("<html>not image</html>"), false},
		{"wrong signature", "image/jpeg", []byte("GIF89a"), false},
		{"unknown mime", "image/svg+xml", []byte("<svg/>"), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isValidImageSignature(tc.data, tc.mime); got != tc.want {
				t.Fatalf("isValidImageSignature(%q) = %v, want %v", tc.mime, got, tc.want)
			}
		})
	}
}


func TestIsValidVideoSignature(t *testing.T) {
	cases := []struct {
		name string
		mime string
		data []byte
		want bool
	}{
		{"mp4", "video/mp4", []byte("\x00\x00\x00\x18ftypisom\x00\x00"), true},
		{"quicktime", "video/quicktime", []byte("\x00\x00\x00\x18ftypqt  \x00\x00"), true},
		{"webm", "video/webm", append([]byte{0x1a, 0x45, 0xdf, 0xa3}, []byte("xxxxwebm")...), true},
		{"spoofed mp4", "video/mp4", []byte("<html>not a video</html>"), false},
		{"wrong mp4 brand", "video/mp4", []byte("\x00\x00\x00\x18ftypqt  \x00\x00"), false},
		{"truncated webm", "video/webm", []byte{0x1a, 0x45, 0xdf, 0xa3}, false},
		{"unknown type", "video/x-custom", []byte("video"), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isValidVideoSignature(tc.data, tc.mime); got != tc.want {
				t.Fatalf("isValidVideoSignature(%q) = %v, want %v", tc.mime, got, tc.want)
			}
		})
	}
}

func TestIsValidImageSignature_AvifCompatibleBrand(t *testing.T) {
	data := []byte("xxxxftypmif1xxxxavif")
	if !isValidImageSignature(data, "image/avif") {
		t.Fatal("AVIF with a compatible avif brand should be accepted")
	}
}


func TestReadUploadPayloadEnforcesActualByteLimit(t *testing.T) {
	data, err := readUploadPayload(bytes.NewReader([]byte("1234")), 4)
	if err != nil {
		t.Fatalf("expected exact-limit upload to pass: %v", err)
	}
	if string(data) != "1234" {
		t.Fatalf("unexpected payload: %q", data)
	}

	_, err = readUploadPayload(bytes.NewReader([]byte("12345")), 4)
	if err == nil {
		t.Fatal("expected oversized upload to be rejected")
	}
}

