package compression

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/errors"
	"github.com/disintegration/imaging"
)

// Quality presets for different use cases
type Quality string

const (
	QualityOriginal  Quality = "original"
	QualityUltra     Quality = "ultra"     // 95% - for high-quality galleries
	QualityHigh      Quality = "high"      // 85% - for product images
	QualityMedium    Quality = "medium"    // 70% - for thumbnails
	QualityLow       Quality = "low"       // 60% - for avatars/icons
	QualityThumbnail Quality = "thumbnail" // 50% - for tiny previews
)

// CompressionConfig holds compression settings
type CompressionConfig struct {
	MaxWidth      int
	MaxHeight     int
	Quality       int
	Format        string // "jpeg", "png", "webp"
	StripMetadata bool
	Progressive   bool // for JPEG
}

// Default presets
var presets = map[Quality]CompressionConfig{
	QualityOriginal: {
		MaxWidth:      0, // no resize
		MaxHeight:     0,
		Quality:       100,
		Format:        "jpeg",
		StripMetadata: true,
		Progressive:   false,
	},
	QualityUltra: {
		MaxWidth:      2560,
		MaxHeight:     2560,
		Quality:       95,
		Format:        "webp",
		StripMetadata: true,
		Progressive:   false,
	},
	QualityHigh: {
		MaxWidth:      1920,
		MaxHeight:     1920,
		Quality:       85,
		Format:        "webp",
		StripMetadata: true,
		Progressive:   false,
	},
	QualityMedium: {
		MaxWidth:      1280,
		MaxHeight:     1280,
		Quality:       70,
		Format:        "webp",
		StripMetadata: true,
		Progressive:   false,
	},
	QualityLow: {
		MaxWidth:      800,
		MaxHeight:     800,
		Quality:       60,
		Format:        "webp",
		StripMetadata: true,
		Progressive:   false,
	},
	QualityThumbnail: {
		MaxWidth:      300,
		MaxHeight:     300,
		Quality:       50,
		Format:        "webp",
		StripMetadata: true,
		Progressive:   false,
	},
}

// CompressionResult holds the compressed image data
type CompressionResult struct {
	Data      []byte
	Format    string
	Width     int
	Height    int
	SizeBytes int
	Quality   int
	Presets   []Quality
}

// Service handles image compression
type Service struct {
	defaultQuality Quality
	enabled        bool
}

// NewService creates a new compression service
func NewService(defaultQuality Quality, enabled bool) *Service {
	return &Service{
		defaultQuality: defaultQuality,
		enabled:        enabled,
	}
}

// Compress compresses an image with the specified quality preset
func (s *Service) Compress(input []byte, quality Quality) (*CompressionResult, error) {
	if !s.enabled {
		return &CompressionResult{
			Data:      input,
			Format:    detectFormat(input),
			SizeBytes: len(input),
		}, nil
	}

	if quality == "" {
		quality = s.defaultQuality
	}

	config, ok := presets[quality]
	if !ok {
		config = presets[QualityHigh]
	}

	img, _, err := decodeImage(input)
	if err != nil {
		return nil, errors.Internal("decode_image_failed", err)
	}

	// Resize if needed
	if config.MaxWidth > 0 || config.MaxHeight > 0 {
		img = imaging.Fit(img, config.MaxWidth, config.MaxHeight, imaging.Lanczos)
	}

	// Encode with compression
	var buf bytes.Buffer
	var outputFormat string

	switch config.Format {
	case "png":
		outputFormat = "png"
		encoder := png.Encoder{CompressionLevel: png.BestCompression}
		err = encoder.Encode(&buf, img)
	default: // jpeg (also used for webp presets since webp encoding is not supported in stdlib)
		outputFormat = "jpeg"
		err = jpeg.Encode(&buf, img, &jpeg.Options{
			Quality: config.Quality,
		})
	}

	if err != nil {
		return nil, errors.Internal("encode_image_failed", err)
	}

	bounds := img.Bounds()

	return &CompressionResult{
		Data:      buf.Bytes(),
		Format:    outputFormat,
		Width:     bounds.Dx(),
		Height:    bounds.Dy(),
		SizeBytes: buf.Len(),
		Quality:   config.Quality,
		Presets:   []Quality{quality},
	}, nil
}

// CompressMultiple compresses an image into multiple quality presets
func (s *Service) CompressMultiple(input []byte, qualities []Quality) (map[Quality]*CompressionResult, error) {
	if !s.enabled {
		format := detectFormat(input)
		result := &CompressionResult{
			Data:      input,
			Format:    format,
			SizeBytes: len(input),
		}
		results := make(map[Quality]*CompressionResult)
		for _, q := range qualities {
			results[q] = result
		}
		return results, nil
	}

	if len(qualities) == 0 {
		qualities = []Quality{QualityHigh, QualityMedium, QualityThumbnail}
	}

	results := make(map[Quality]*CompressionResult)
	for _, q := range qualities {
		result, err := s.Compress(input, q)
		if err != nil {
			return nil, err
		}
		results[q] = result
	}

	return results, nil
}

// CompressForProduct compresses an image for product use (high + thumbnail)
func (s *Service) CompressForProduct(input []byte) (map[Quality]*CompressionResult, error) {
	return s.CompressMultiple(input, []Quality{QualityHigh, QualityMedium, QualityThumbnail})
}

// CompressForGallery compresses an image for gallery use (ultra + high + thumbnail)
func (s *Service) CompressForGallery(input []byte) (map[Quality]*CompressionResult, error) {
	return s.CompressMultiple(input, []Quality{QualityUltra, QualityHigh, QualityMedium, QualityThumbnail})
}

// CompressForAvatar compresses an image for avatar use (medium)
func (s *Service) CompressForAvatar(input []byte) (*CompressionResult, error) {
	return s.Compress(input, QualityMedium)
}

// CompressForMap compresses an image for map use (high)
func (s *Service) CompressForMap(input []byte) (*CompressionResult, error) {
	return s.Compress(input, QualityHigh)
}

// CompressForBooking compresses an image for booking use (medium)
func (s *Service) CompressForBooking(input []byte) (*CompressionResult, error) {
	return s.Compress(input, QualityMedium)
}

// GetCompressedURL returns a URL for a compressed version of an image
func (s *Service) GetCompressedURL(originalURL string, quality Quality) string {
	if !s.enabled || quality == QualityOriginal {
		return originalURL
	}

	// Extract filename and add quality suffix
	parts := strings.Split(originalURL, ".")
	if len(parts) < 2 {
		return originalURL
	}

	base := strings.Join(parts[:len(parts)-1], ".")

	return fmt.Sprintf("%s_%s.%s", base, quality, "webp")
}

// detectFormat detects the image format from bytes
func detectFormat(data []byte) string {
	if len(data) < 12 {
		return "unknown"
	}

	// JPEG
	if data[0] == 0xFF && data[1] == 0xD8 {
		return "jpeg"
	}

	// PNG
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "png"
	}

	// WebP
	if data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50 {
		return "webp"
	}

	return "unknown"
}

// decodeImage decodes an image from bytes
func decodeImage(data []byte) (image.Image, string, error) {
	format := detectFormat(data)
	reader := bytes.NewReader(data)

	var img image.Image
	var err error

	switch format {
	case "jpeg":
		img, err = jpeg.Decode(reader)
	case "png":
		img, err = png.Decode(reader)
	case "webp":
		img, _, err = image.Decode(reader)
	default:
		// Try all formats
		img, format, err = image.Decode(reader)
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	return img, format, nil
}

// ReadAll reads all data from a reader
func ReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}

// suppress unused import
var _ = strings.Join
