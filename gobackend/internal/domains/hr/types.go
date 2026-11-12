package hr

// Role represents an HR role within a shop
type Role struct {
	ID          string           `json:"id"`
	ShopID      string           `json:"shop_id"`
	Name        string           `json:"name"`
	NameAr      string           `json:"name_ar"`
	Color       string           `json:"color"`
	IsSystem    bool             `json:"is_system"`
	FullAccess  bool             `json:"full_access"`
	Status      string           `json:"status"`
	Permissions []RolePermission `json:"permissions"`
	Users       int64            `json:"users"`
	CreatedAt   string           `json:"created_at"`
}

// RolePermission represents a module-level permission for a role
type RolePermission struct {
	ModuleID string   `json:"moduleId"`
	Actions  []string `json:"actions"`
}

// AccessLog represents an audit log entry for permission/role changes
type AccessLog struct {
	ID         string `json:"id"`
	ShopID     string `json:"shop_id"`
	Actor      string `json:"actor"`
	Action     string `json:"action"`
	ActionAr   string `json:"action_ar"`
	Target     string `json:"target"`
	Details    string `json:"details"`
	DetailsAr  string `json:"details_ar"`
	Timestamp  string `json:"timestamp"`
}

// Employee represents an employee record
type Employee struct {
	ID         string  `json:"id"`
	ShopID     string  `json:"shop_id"`
	Name       string  `json:"name"`
	Email      string  `json:"email"`
	Phone      string  `json:"phone"`
	Role       string  `json:"role"`
	RoleID     string  `json:"role_id"`
	Status     string  `json:"status"`
	Salary     float64 `json:"salary"`
	HireDate   string  `json:"hire_date"`
	CreatedAt  string  `json:"created_at"`
}

// AttendanceRecord represents a single attendance entry
type AttendanceRecord struct {
	ID           string `json:"id"`
	ShopID       string `json:"shop_id"`
	EmployeeID   string `json:"employee_id"`
	EmployeeName string `json:"employeeName"`
	Date         string `json:"date"`
	CheckIn      string `json:"checkIn"`
	CheckOut     string `json:"checkOut"`
	Hours        string `json:"hours"`
	Status       string `json:"status"`
}

// PayrollRecord represents a single payroll entry
type PayrollRecord struct {
	ID           string  `json:"id"`
	ShopID       string  `json:"shop_id"`
	EmployeeID   string  `json:"employee_id"`
	EmployeeName string  `json:"employeeName"`
	Amount       float64 `json:"amount"`
	Period       string  `json:"period"`
	Status       string  `json:"status"`
	PaidAt       string  `json:"paid_at"`
}

// Leave represents a leave request
type Leave struct {
	ID           string `json:"id"`
	ShopID       string `json:"shop_id"`
	EmployeeName string `json:"employeeName"`
	Type         string `json:"type"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	Days         int    `json:"days"`
	Reason       string `json:"reason"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}

// Task represents an employee task
type Task struct {
	ID          string `json:"id"`
	ShopID      string `json:"shop_id"`
	Title       string `json:"title"`
	Assignee    string `json:"assignee"`
	Priority    string `json:"priority"`
	Status      string `json:"status"`
	DueDate     string `json:"dueDate"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

// CheckOutRecord represents a check-in/check-out record
type CheckOutRecord struct {
	ID           string `json:"id"`
	ShopID       string `json:"shop_id"`
	EmployeeName string `json:"employeeName"`
	Date         string `json:"date"`
	CheckIn      string `json:"checkIn"`
	CheckOut     string `json:"checkOut"`
	Hours        string `json:"hours"`
	Status       string `json:"status"`
}
