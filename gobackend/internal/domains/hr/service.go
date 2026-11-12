package hr

import "context"

// Service handles HR business logic
type Service struct {
	repo *Repository
}

// NewService creates a new HR service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Roles
func (s *Service) ListRoles(ctx context.Context, shopID string) ([]Role, error) {
	return s.repo.ListRoles(ctx, shopID)
}
func (s *Service) GetRole(ctx context.Context, shopID, roleID string) (*Role, error) {
	return s.repo.GetRole(ctx, shopID, roleID)
}
func (s *Service) CreateRole(ctx context.Context, shopID string, dto *CreateRoleDTO) (*Role, error) {
	return s.repo.CreateRole(ctx, shopID, dto)
}
func (s *Service) UpdateRole(ctx context.Context, shopID, roleID string, dto *UpdateRoleDTO) (*Role, error) {
	return s.repo.UpdateRole(ctx, shopID, roleID, dto)
}
func (s *Service) DeleteRole(ctx context.Context, shopID, roleID string) error {
	return s.repo.DeleteRole(ctx, shopID, roleID)
}

// Access Logs
func (s *Service) ListAccessLogs(ctx context.Context, shopID string, limit int) ([]AccessLog, error) {
	return s.repo.ListAccessLogs(ctx, shopID, limit)
}
func (s *Service) AddAccessLog(ctx context.Context, shopID, actor, action, actionAr, target, details, detailsAr string) error {
	return s.repo.AddAccessLog(ctx, shopID, actor, action, actionAr, target, details, detailsAr)
}

// Employees
func (s *Service) ListEmployees(ctx context.Context, shopID string) ([]Employee, error) {
	return s.repo.ListEmployees(ctx, shopID)
}
func (s *Service) CreateEmployee(ctx context.Context, shopID string, dto *CreateEmployeeDTO) (*Employee, error) {
	return s.repo.CreateEmployee(ctx, shopID, dto)
}
func (s *Service) UpdateEmployee(ctx context.Context, shopID, employeeID string, dto *UpdateEmployeeDTO) (*Employee, error) {
	return s.repo.UpdateEmployee(ctx, shopID, employeeID, dto)
}
func (s *Service) DeleteEmployee(ctx context.Context, shopID, employeeID string) error {
	return s.repo.DeleteEmployee(ctx, shopID, employeeID)
}

// Attendance
func (s *Service) ListAttendance(ctx context.Context, shopID string) ([]AttendanceRecord, error) {
	return s.repo.ListAttendance(ctx, shopID)
}
func (s *Service) CreateAttendance(ctx context.Context, shopID string, dto *CreateAttendanceDTO) (*AttendanceRecord, error) {
	return s.repo.CreateAttendance(ctx, shopID, dto)
}

// Payroll
func (s *Service) ListPayroll(ctx context.Context, shopID string) ([]PayrollRecord, error) {
	return s.repo.ListPayroll(ctx, shopID)
}
func (s *Service) CreatePayroll(ctx context.Context, shopID string, dto *CreatePayrollDTO) (*PayrollRecord, error) {
	return s.repo.CreatePayroll(ctx, shopID, dto)
}

// Leaves
func (s *Service) ListLeaves(ctx context.Context, shopID string) ([]Leave, error) {
	return s.repo.ListLeaves(ctx, shopID)
}
func (s *Service) CreateLeave(ctx context.Context, shopID string, dto *CreateLeaveDTO) (*Leave, error) {
	return s.repo.CreateLeave(ctx, shopID, dto)
}
func (s *Service) UpdateLeaveStatus(ctx context.Context, shopID, leaveID, status string) (*Leave, error) {
	return s.repo.UpdateLeaveStatus(ctx, shopID, leaveID, status)
}

// Tasks
func (s *Service) ListTasks(ctx context.Context, shopID string) ([]Task, error) {
	return s.repo.ListTasks(ctx, shopID)
}
func (s *Service) CreateTask(ctx context.Context, shopID string, dto *CreateTaskDTO) (*Task, error) {
	return s.repo.CreateTask(ctx, shopID, dto)
}
func (s *Service) UpdateTask(ctx context.Context, shopID, taskID string, dto *UpdateTaskDTO) (*Task, error) {
	return s.repo.UpdateTask(ctx, shopID, taskID, dto)
}
func (s *Service) DeleteTask(ctx context.Context, shopID, taskID string) error {
	return s.repo.DeleteTask(ctx, shopID, taskID)
}

// CheckOuts
func (s *Service) ListCheckOuts(ctx context.Context, shopID string) ([]CheckOutRecord, error) {
	return s.repo.ListCheckOuts(ctx, shopID)
}
func (s *Service) CreateCheckOut(ctx context.Context, shopID string, dto *CreateAttendanceDTO) (*CheckOutRecord, error) {
	return s.repo.CreateCheckOut(ctx, shopID, dto)
}
