package hr

import "github.com/go-playground/validator/v10"

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

type CreateRoleDTO struct {
	Name       string           `json:"name" validate:"required,min=1,max=120"`
	NameAr     string           `json:"name_ar,omitempty" validate:"omitempty,max=120"`
	Color      string           `json:"color,omitempty"`
	FullAccess bool             `json:"full_access"`
	Permissions []RolePermission `json:"permissions,omitempty"`
}

func (r *CreateRoleDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

type UpdateRoleDTO struct {
	Name        *string           `json:"name,omitempty" validate:"omitempty,min=1,max=120"`
	NameAr      *string           `json:"name_ar,omitempty" validate:"omitempty,max=120"`
	Color       *string           `json:"color,omitempty"`
	FullAccess  *bool             `json:"full_access,omitempty"`
	Status      *string           `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
	Permissions *[]RolePermission `json:"permissions,omitempty"`
}

func (r *UpdateRoleDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

type CreateEmployeeDTO struct {
	Name     string  `json:"name" validate:"required,min=1,max=160"`
	Email    string  `json:"email,omitempty" validate:"omitempty,email,max=160"`
	Phone    string  `json:"phone,omitempty" validate:"omitempty,max=40"`
	Role     string  `json:"role,omitempty" validate:"omitempty,max=80"`
	RoleID   string  `json:"role_id,omitempty"`
	Status   string  `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
	Salary   float64 `json:"salary,omitempty"`
	HireDate string  `json:"hire_date,omitempty"`
}

func (r *CreateEmployeeDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

type UpdateEmployeeDTO struct {
	Name     *string  `json:"name,omitempty" validate:"omitempty,min=1,max=160"`
	Email    *string  `json:"email,omitempty" validate:"omitempty,email,max=160"`
	Phone    *string  `json:"phone,omitempty" validate:"omitempty,max=40"`
	Role     *string  `json:"role,omitempty" validate:"omitempty,max=80"`
	RoleID   *string  `json:"role_id,omitempty"`
	Status   *string  `json:"status,omitempty" validate:"omitempty,oneof=active inactive"`
	Salary   *float64 `json:"salary,omitempty"`
	HireDate *string  `json:"hire_date,omitempty"`
}

func (r *UpdateEmployeeDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Attendance / CheckOut
// ---------------------------------------------------------------------------

type CreateAttendanceDTO struct {
	EmployeeID   string `json:"employee_id,omitempty"`
	EmployeeName string `json:"employeeName,omitempty"`
	Date         string `json:"date,omitempty"`
	CheckIn      string `json:"checkIn,omitempty"`
	CheckOut     string `json:"checkOut,omitempty"`
	Hours        string `json:"hours,omitempty"`
	Status       string `json:"status,omitempty" validate:"omitempty,oneof=present late absent"`
}

func (r *CreateAttendanceDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

type CreatePayrollDTO struct {
	EmployeeID   string  `json:"employee_id,omitempty"`
	EmployeeName string  `json:"employeeName,omitempty"`
	Amount       float64 `json:"amount" validate:"required,min=0"`
	Period       string  `json:"period,omitempty"`
	Status       string  `json:"status,omitempty" validate:"omitempty,oneof=paid pending"`
}

func (r *CreatePayrollDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

type CreateLeaveDTO struct {
	EmployeeName string `json:"employeeName" validate:"required,min=1,max=160"`
	Type         string `json:"type,omitempty" validate:"omitempty,oneof=annual sick unpaid emergency"`
	StartDate    string `json:"startDate" validate:"required"`
	EndDate      string `json:"endDate" validate:"required"`
	Reason       string `json:"reason,omitempty"`
}

func (r *CreateLeaveDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

type UpdateLeaveStatusDTO struct {
	Status string `json:"status" validate:"required,oneof=pending approved rejected"`
}

func (r *UpdateLeaveStatusDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

type CreateTaskDTO struct {
	Title       string `json:"title" validate:"required,min=1,max=200"`
	Assignee    string `json:"assignee,omitempty" validate:"omitempty,max=160"`
	Priority    string `json:"priority,omitempty" validate:"omitempty,oneof=low medium high"`
	Status      string `json:"status,omitempty" validate:"omitempty,oneof=todo inProgress done"`
	DueDate     string `json:"dueDate,omitempty"`
	Description string `json:"description,omitempty"`
}

func (r *CreateTaskDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

type UpdateTaskDTO struct {
	Title       *string `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Assignee    *string `json:"assignee,omitempty" validate:"omitempty,max=160"`
	Priority    *string `json:"priority,omitempty" validate:"omitempty,oneof=low medium high"`
	Status      *string `json:"status,omitempty" validate:"omitempty,oneof=todo inProgress done"`
	DueDate     *string `json:"dueDate,omitempty"`
	Description *string `json:"description,omitempty"`
}

func (r *UpdateTaskDTO) Validate(v *validator.Validate) error { return v.Struct(r) }

// ---------------------------------------------------------------------------
// Generic responses
// ---------------------------------------------------------------------------

type RoleResponse struct {
	Success bool   `json:"success"`
	Data    *Role  `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

type RolesResponse struct {
	Success bool    `json:"success"`
	Data    []Role  `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
}

type AccessLogsResponse struct {
	Success bool         `json:"success"`
	Data    []AccessLog  `json:"data,omitempty"`
	Error   string       `json:"error,omitempty"`
}

type EmployeesResponse struct {
	Success bool        `json:"success"`
	Data    []Employee  `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type EmployeeResponse struct {
	Success bool      `json:"success"`
	Data    *Employee `json:"data,omitempty"`
	Error   string    `json:"error,omitempty"`
}

type AttendanceResponse struct {
	Success bool               `json:"success"`
	Data    []AttendanceRecord `json:"data,omitempty"`
	Error   string             `json:"error,omitempty"`
}

type PayrollResponse struct {
	Success bool            `json:"success"`
	Data    []PayrollRecord `json:"data,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type LeavesResponse struct {
	Success bool    `json:"success"`
	Data    []Leave `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
}

type LeaveResponse struct {
	Success bool   `json:"success"`
	Data    *Leave `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

type TasksResponse struct {
	Success bool    `json:"success"`
	Data    []Task  `json:"data,omitempty"`
	Error   string  `json:"error,omitempty"`
}

type TaskResponse struct {
	Success bool   `json:"success"`
	Data    *Task  `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

type CheckOutsResponse struct {
	Success bool              `json:"success"`
	Data    []CheckOutRecord  `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
}

type GenericResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}
