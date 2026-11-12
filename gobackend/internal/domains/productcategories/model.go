package productcategories

import "time"

// Category is a product category belonging to a shop.
type Category struct {
	ID               string    `json:"id"`
	ShopID           string    `json:"shopId"`
	Name             string    `json:"name"`
	NameAr           string    `json:"nameAr"`
	Description      string    `json:"description"`
	ParentCategoryID *string   `json:"parentCategoryId,omitempty"`
	Image            string    `json:"image"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// CreateCategoryRequest is the payload for creating a new category.
type CreateCategoryRequest struct {
	ShopID           string  `json:"shopId"`
	Name             string  `json:"name"`
	NameAr           string  `json:"nameAr"`
	Description      string  `json:"description"`
	ParentCategoryID *string `json:"parentCategory,omitempty"`
	Image            string  `json:"image"`
	Status           string  `json:"status"`
}

// UpdateCategoryRequest is the payload for updating a category.
type UpdateCategoryRequest struct {
	Name             *string `json:"name,omitempty"`
	NameAr           *string `json:"nameAr,omitempty"`
	Description      *string `json:"description,omitempty"`
	ParentCategoryID *string `json:"parentCategory,omitempty"`
	Image            *string `json:"image,omitempty"`
	Status           *string `json:"status,omitempty"`
}
