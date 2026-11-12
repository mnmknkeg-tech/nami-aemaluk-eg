package media

import "time"

// Media represents a media record in the database.
type Media struct {
	ID                 string            `json:"id"`
	ShopID             string            `json:"shopId"`
	UploadedBy         *string           `json:"uploadedBy,omitempty"`
	Purpose            string            `json:"purpose"`
	OriginalKey        string            `json:"originalKey"`
	OriginalURL        string            `json:"originalUrl"`
	MimeType           string            `json:"mimeType"`
	FileSize           *int64            `json:"fileSize,omitempty"`
	Width              *int              `json:"width,omitempty"`
	Height             *int              `json:"height,omitempty"`
	ThumbKey           *string           `json:"thumbKey,omitempty"`
	ThumbURL           *string           `json:"thumbUrl,omitempty"`
	SmallKey           *string           `json:"smallKey,omitempty"`
	SmallURL           *string           `json:"smallUrl,omitempty"`
	MediumKey          *string           `json:"mediumKey,omitempty"`
	MediumURL          *string           `json:"mediumUrl,omitempty"`
	OptimizedKey       *string           `json:"optimizedKey,omitempty"`
	OptimizedURL       *string           `json:"optimizedUrl,omitempty"`
	OptimizationStatus string            `json:"optimizationStatus"`
	OptimizationError  *string           `json:"optimizationError,omitempty"`
	LinkedType         *string           `json:"linkedType,omitempty"`
	LinkedID           *string           `json:"linkedId,omitempty"`
	CompressedURLs     map[string]string `json:"compressedUrls,omitempty"`
	IsActive           bool              `json:"isActive"`
	CreatedAt          time.Time         `json:"createdAt"`
	UpdatedAt          time.Time         `json:"updatedAt"`
}

// PresignUploadRequest is the payload for generating a presigned upload URL.
type PresignUploadRequest struct {
	ShopID      string  `json:"shopId" validate:"required"`
	Filename    string  `json:"filename" validate:"required"`
	ContentType string  `json:"contentType" validate:"required"`
	Purpose     string  `json:"purpose,omitempty"`
	FileSize    *int64  `json:"fileSize,omitempty"`
	LinkedType  *string `json:"linkedType,omitempty"`
	LinkedID    *string `json:"linkedId,omitempty"`
}

// PresignUploadResponse contains the URL and metadata for direct upload.
type PresignUploadResponse struct {
	URL         string `json:"url"`
	Key         string `json:"key"`
	PublicURL   string `json:"publicUrl"`
	ContentType string `json:"contentType"`
	ExpiresIn   int    `json:"expiresIn"`
}

// CompleteUploadRequest finalizes a media upload after direct upload to S3.
type CompleteUploadRequest struct {
	ShopID     string  `json:"shopId" validate:"required"`
	Key        string  `json:"key" validate:"required"`
	MimeType   string  `json:"mimeType" validate:"required"`
	Purpose    string  `json:"purpose,omitempty"`
	FileSize   *int64  `json:"fileSize,omitempty"`
	Width      *int    `json:"width,omitempty"`
	Height     *int    `json:"height,omitempty"`
	PublicURL  *string `json:"publicUrl,omitempty"`
	LinkedType *string `json:"linkedType,omitempty"`
	LinkedID   *string `json:"linkedId,omitempty"`
}

// ListMediaRequest is the query for listing a shop's media.
type ListMediaRequest struct {
	ShopID  string `query:"shopId" validate:"required"`
	Purpose string `query:"purpose,omitempty"`
	Page    int    `query:"page"`
	Limit   int    `query:"limit"`
}
