package gallery

import "github.com/go-playground/validator/v10"

// CreateGalleryItemDTO represents a DTO for creating a gallery item
type CreateGalleryItemDTO struct {
	Title    string `json:"title" validate:"required,min=1,max=255"`
	ImageURL string `json:"image_url" validate:"required,url"`
	Order    int    `json:"order,omitempty"`
}

// Validate validates the DTO
func (d *CreateGalleryItemDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// UpdateGalleryItemDTO represents a DTO for updating a gallery item
type UpdateGalleryItemDTO struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	ImageURL *string `json:"image_url,omitempty" validate:"omitempty,url"`
	Order    *int    `json:"order,omitempty"`
}

// Validate validates the DTO
func (d *UpdateGalleryItemDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// GalleryItemResponse represents a gallery item response
type GalleryItemResponse struct {
	Success bool         `json:"success"`
	Data    *GalleryItem `json:"data,omitempty"`
	Error   string       `json:"error,omitempty"`
}

// GalleryItemsListResponse represents a list of gallery items response
type GalleryItemsListResponse struct {
	Success bool          `json:"success"`
	Data    []GalleryItem `json:"data,omitempty"`
	Total   int64         `json:"total,omitempty"`
	Error   string        `json:"error,omitempty"`
}
