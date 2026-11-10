package complaints

import "github.com/go-playground/validator/v10"

// CreateComplaintDTO matches the payload sent by the dashboard's
// handleAdd() in the CRM complaints page.
type CreateComplaintDTO struct {
	ShopID           string   `json:"shopId" validate:"required"`
	Subject          string   `json:"subject" validate:"required,min=1,max=255"`
	SubjectAr        string   `json:"subjectAr,omitempty"`
	Description      string   `json:"description,omitempty"`
	CustomerName     string   `json:"customerName,omitempty"`
	CustomerEmail    string   `json:"customerEmail,omitempty"`
	CustomerPhone    string   `json:"customerPhone,omitempty"`
	Status           string   `json:"status,omitempty" validate:"omitempty,oneof=open pending resolved closed"`
	Priority         string   `json:"priority,omitempty" validate:"omitempty,oneof=low medium high urgent"`
	Category         string   `json:"category,omitempty"`
	AssignedTo       string   `json:"assignedTo,omitempty"`
	Department       string   `json:"department,omitempty"`
	ReportedDate     string   `json:"reportedDate,omitempty"`
	Resolution       string   `json:"resolution,omitempty"`
	FollowUpRequired bool     `json:"followUpRequired,omitempty"`
	FollowUpDate     string   `json:"followUpDate,omitempty"`
	Attachments      []string `json:"attachments,omitempty"`
	Tags             []string `json:"tags,omitempty"`
}

// Validate validates the DTO.
func (d *CreateComplaintDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// UpdateComplaintDTO matches the payload sent by handleEdit() — a partial
// patch of the same fields. All fields are optional.
type UpdateComplaintDTO struct {
	Subject          string   `json:"subject,omitempty"`
	SubjectAr        string   `json:"subjectAr,omitempty"`
	Description      string   `json:"description,omitempty"`
	CustomerName     string   `json:"customerName,omitempty"`
	CustomerEmail    string   `json:"customerEmail,omitempty"`
	CustomerPhone    string   `json:"customerPhone,omitempty"`
	Status           string   `json:"status,omitempty" validate:"omitempty,oneof=open pending resolved closed"`
	Priority         string   `json:"priority,omitempty" validate:"omitempty,oneof=low medium high urgent"`
	Category         string   `json:"category,omitempty"`
	AssignedTo       string   `json:"assignedTo,omitempty"`
	Department       string   `json:"department,omitempty"`
	ReportedDate     string   `json:"reportedDate,omitempty"`
	ResolvedDate     *string  `json:"resolvedDate,omitempty"`
	Resolution       string   `json:"resolution,omitempty"`
	FollowUpRequired *bool    `json:"followUpRequired,omitempty"`
	FollowUpDate     *string  `json:"followUpDate,omitempty"`
	Attachments      []string `json:"attachments,omitempty"`
	Tags             []string `json:"tags,omitempty"`
}

// Validate validates the DTO.
func (d *UpdateComplaintDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// BulkDeleteDTO matches { "ids": ["...", "..."] } sent by the dashboard's
// bulkDelete() in the CRM pages.
type BulkDeleteDTO struct {
	IDs []string `json:"ids" validate:"required,min=1,max=500,dive,required"`
}

// Validate validates the DTO.
func (d *BulkDeleteDTO) Validate(v *validator.Validate) error {
	return v.Struct(d)
}

// ComplaintResponse is a single-complaint JSON envelope.
type ComplaintResponse struct {
	Success bool       `json:"success"`
	Data    *Complaint `json:"data,omitempty"`
	Error   string     `json:"error,omitempty"`
}

// ComplaintsListResponse is a list JSON envelope.
type ComplaintsListResponse struct {
	Success bool        `json:"success"`
	Data    []Complaint `json:"data,omitempty"`
	Total   int64       `json:"total,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// BulkDeleteResponse reports how many rows were removed.
type BulkDeleteResponse struct {
	Success bool   `json:"success"`
	Deleted int64  `json:"deleted"`
	Error   string `json:"error,omitempty"`
}
