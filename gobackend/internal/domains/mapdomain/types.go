package mapdomain

// MapPin represents a map pin returned by the API
type MapPin struct {
	ID           string   `json:"id,omitempty"`
	Slug         string   `json:"slug,omitempty"`
	Type         string   `json:"type"`
	Title        string   `json:"title,omitempty"`
	AddressLabel string   `json:"addressLabel,omitempty"`
	City         string   `json:"city,omitempty"`
	Latitude     *float64 `json:"latitude"`
	Longitude    *float64 `json:"longitude"`
}

// MapPinsResponse represents a map pins response
type MapPinsResponse struct {
	Success bool     `json:"success"`
	Data    []MapPin `json:"data,omitempty"`
	Error   string   `json:"error,omitempty"`
}

// SubmitListingBranchRequest represents the branch info submitted with a listing
type SubmitListingBranchRequest struct {
	Name         string  `json:"name,omitempty"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	AddressLabel string  `json:"addressLabel,omitempty"`
	Governorate  string  `json:"governorate,omitempty"`
	City         string  `json:"city,omitempty"`
	Phone        string  `json:"phone,omitempty"`
}

// SubmitListingRequest is the body for POST /map-listings/public/submit
type SubmitListingRequest struct {
	Title        string                     `json:"title"`
	Category     string                     `json:"category,omitempty"`
	Description  string                     `json:"description,omitempty"`
	WebsiteUrl   string                     `json:"websiteUrl,omitempty"`
	Phone        string                     `json:"phone,omitempty"`
	Whatsapp     string                     `json:"whatsapp,omitempty"`
	SocialLinks  map[string]any             `json:"socialLinks,omitempty"`
	LogoUrl      string                     `json:"logoUrl,omitempty"`
	CoverUrl     string                     `json:"coverUrl,omitempty"`
	LinkedShopId string                     `json:"linkedShopId,omitempty"`
	Branch       SubmitListingBranchRequest `json:"branch"`
}

// SubmitListingResponse is the response for POST /map-listings/public/submit
type SubmitListingResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
	ListingId string `json:"listingId,omitempty"`
}
