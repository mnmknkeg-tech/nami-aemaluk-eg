package complaints

// ComplaintStatus represents the lifecycle status of a complaint.
type ComplaintStatus string

const (
	ComplaintStatusOpen     ComplaintStatus = "open"
	ComplaintStatusPending  ComplaintStatus = "pending"
	ComplaintStatusResolved ComplaintStatus = "resolved"
	ComplaintStatusClosed   ComplaintStatus = "closed"
)

// ComplaintPriority represents the urgency of a complaint.
type ComplaintPriority string

const (
	ComplaintPriorityLow    ComplaintPriority = "low"
	ComplaintPriorityMedium ComplaintPriority = "medium"
	ComplaintPriorityHigh   ComplaintPriority = "high"
	ComplaintPriorityUrgent ComplaintPriority = "urgent"
)

// Complaint matches the shape consumed by the dashboard CRM complaints page
// (apps/dashboard-web/app/dashboard/(main)/crm/complaints/page.tsx). JSON tags
// are camelCase; the frontend also accepts snake_case fallbacks.
type Complaint struct {
	ID               string            `json:"id"`
	ShopID           string            `json:"shopId"`
	Subject          string            `json:"subject"`
	SubjectAr        string            `json:"subjectAr"`
	Description      string            `json:"description"`
	CustomerName     string            `json:"customerName"`
	CustomerEmail    string            `json:"customerEmail"`
	CustomerPhone    string            `json:"customerPhone"`
	Status           ComplaintStatus   `json:"status"`
	Priority         ComplaintPriority `json:"priority"`
	Category         string            `json:"category"`
	AssignedTo       string            `json:"assignedTo"`
	Department       string            `json:"department"`
	ReportedDate     string            `json:"reportedDate"`
	ResolvedDate     *string           `json:"resolvedDate"`
	Resolution       string            `json:"resolution"`
	FollowUpRequired bool              `json:"followUpRequired"`
	FollowUpDate     *string           `json:"followUpDate"`
	Attachments      []string          `json:"attachments"`
	Tags             []string          `json:"tags"`
	CreatedAt        string            `json:"createdAt"`
	UpdatedAt        string            `json:"updatedAt"`
}
