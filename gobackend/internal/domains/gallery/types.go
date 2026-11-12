package gallery

// GalleryItem represents a gallery item
type GalleryItem struct {
	ID        string  `json:"id"`
	ShopID    string  `json:"shop_id"`
	Title     string  `json:"title"`
	ImageURL  string  `json:"image_url"`
	Order     int     `json:"order"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

// CreateGalleryItemRequest represents a request to create a gallery item
type CreateGalleryItemRequest struct {
	Title    string `json:"title" validate:"required,min=1,max=255"`
	ImageURL string `json:"image_url" validate:"required,url"`
	Order    int    `json:"order,omitempty"`
}

// UpdateGalleryItemRequest represents a request to update a gallery item
type UpdateGalleryItemRequest struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	ImageURL *string `json:"image_url,omitempty" validate:"omitempty,url"`
	Order    *int    `json:"order,omitempty"`
}
