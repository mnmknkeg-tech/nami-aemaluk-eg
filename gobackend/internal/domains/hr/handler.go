package hr

import (
	"strconv"
	"strings"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/config"
	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Handler handles HTTP requests for the HR module
type Handler struct {
	service  *Service
	validate *validator.Validate
	config   *config.Config
}

// NewHandler creates a new HR handler
func NewHandler(service *Service, config *config.Config) *Handler {
	return &Handler{service: service, validate: validator.New(), config: config}
}

// RegisterRoutes registers HR routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	hr := app.Group("/hr", middleware.RequireAuth(h.config))

	// Roles & permissions
	hr.Get("/shops/:shopId/roles", h.ListRoles)
	hr.Get("/shops/:shopId/roles/:roleId", h.GetRole)
	hr.Post("/shops/:shopId/roles", h.CreateRole)
	hr.Put("/shops/:shopId/roles/:roleId", h.UpdateRole)
	hr.Delete("/shops/:shopId/roles/:roleId", h.DeleteRole)

	// Access logs
	hr.Get("/shops/:shopId/access-logs", h.ListAccessLogs)

	// Employees
	hr.Get("/shops/:shopId/employees", h.ListEmployees)
	hr.Post("/shops/:shopId/employees", h.CreateEmployee)
	hr.Put("/shops/:shopId/employees/:employeeId", h.UpdateEmployee)
	hr.Delete("/shops/:shopId/employees/:employeeId", h.DeleteEmployee)

	// Attendance
	hr.Get("/shops/:shopId/attendance", h.ListAttendance)
	hr.Post("/shops/:shopId/attendance", h.CreateAttendance)

	// Payroll
	hr.Get("/shops/:shopId/payroll", h.ListPayroll)
	hr.Post("/shops/:shopId/payroll", h.CreatePayroll)

	// Leaves
	hr.Get("/shops/:shopId/leaves", h.ListLeaves)
	hr.Post("/shops/:shopId/leaves", h.CreateLeave)
	hr.Patch("/shops/:shopId/leaves/:leaveId/status", h.UpdateLeaveStatus)

	// Tasks
	hr.Get("/shops/:shopId/tasks", h.ListTasks)
	hr.Post("/shops/:shopId/tasks", h.CreateTask)
	hr.Put("/shops/:shopId/tasks/:taskId", h.UpdateTask)
	hr.Delete("/shops/:shopId/tasks/:taskId", h.DeleteTask)

	// CheckOuts
	hr.Get("/shops/:shopId/checkouts", h.ListCheckOuts)
	hr.Post("/shops/:shopId/checkouts", h.CreateCheckOut)
}

// ---------------------------------------------------------------------------
// Authorization helper
// ---------------------------------------------------------------------------

func (h *Handler) checkShopAccess(c *fiber.Ctx) (string, bool) {
	shopID := c.Params("shopId")
	if shopID == "" {
		return "", false
	}
	user, ok := middleware.AuthUserFromContext(c)
	if !ok {
		return shopID, false
	}
	if !isAdminRole(user.Role) && user.ShopID != shopID {
		return shopID, false
	}
	return shopID, true
}

// isAdminRole matches admin roles case-insensitively so "admin", "ADMIN"
// and "Super_Admin" style values all pass the gate.
func isAdminRole(role string) bool {
	switch strings.ToUpper(strings.TrimSpace(role)) {
	case "ADMIN", "SUPER_ADMIN", "SUPERADMIN", "SUPER-ADMIN":
		return true
	default:
		return false
	}
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

func (h *Handler) ListRoles(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(RolesResponse{Success: false, Error: "Unauthorized"})
	}
	roles, err := h.service.ListRoles(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(RolesResponse{Success: false, Error: "Failed to retrieve roles"})
	}
	return c.JSON(RolesResponse{Success: true, Data: roles})
}

func (h *Handler) GetRole(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(RoleResponse{Success: false, Error: "Unauthorized"})
	}
	role, err := h.service.GetRole(c.Context(), shopID, c.Params("roleId"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(RoleResponse{Success: false, Error: "Role not found"})
	}
	return c.JSON(RoleResponse{Success: true, Data: role})
}

func (h *Handler) CreateRole(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(RoleResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateRoleDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(RoleResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(RoleResponse{Success: false, Error: err.Error()})
	}
	role, err := h.service.CreateRole(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(RoleResponse{Success: false, Error: "Failed to create role"})
	}
	// Log
	user, _ := middleware.AuthUserFromContext(c)
	actor := user.Email
	_ = h.service.AddAccessLog(c.Context(), shopID, actor, "Created role", "إنشاء دور", role.Name, "", "")
	return c.Status(fiber.StatusCreated).JSON(RoleResponse{Success: true, Data: role})
}

func (h *Handler) UpdateRole(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(RoleResponse{Success: false, Error: "Unauthorized"})
	}
	var dto UpdateRoleDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(RoleResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(RoleResponse{Success: false, Error: err.Error()})
	}
	role, err := h.service.UpdateRole(c.Context(), shopID, c.Params("roleId"), &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(RoleResponse{Success: false, Error: "Failed to update role"})
	}
	user, _ := middleware.AuthUserFromContext(c)
	_ = h.service.AddAccessLog(c.Context(), shopID, user.Email, "Updated role", "تحديث دور", role.Name, "", "")
	return c.JSON(RoleResponse{Success: true, Data: role})
}

func (h *Handler) DeleteRole(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(GenericResponse{Success: false, Error: "Unauthorized"})
	}
	if err := h.service.DeleteRole(c.Context(), shopID, c.Params("roleId")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(GenericResponse{Success: false, Error: err.Error()})
	}
	user, _ := middleware.AuthUserFromContext(c)
	_ = h.service.AddAccessLog(c.Context(), shopID, user.Email, "Deleted role", "حذف دور", c.Params("roleId"), "", "")
	return c.JSON(GenericResponse{Success: true})
}

// ---------------------------------------------------------------------------
// Access Logs
// ---------------------------------------------------------------------------

func (h *Handler) ListAccessLogs(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(AccessLogsResponse{Success: false, Error: "Unauthorized"})
	}
	limit := 50
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			limit = v
		}
	}
	logs, err := h.service.ListAccessLogs(c.Context(), shopID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AccessLogsResponse{Success: false, Error: "Failed to retrieve access logs"})
	}
	return c.JSON(AccessLogsResponse{Success: true, Data: logs})
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

func (h *Handler) ListEmployees(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(EmployeesResponse{Success: false, Error: "Unauthorized"})
	}
	employees, err := h.service.ListEmployees(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(EmployeesResponse{Success: false, Error: "Failed to retrieve employees"})
	}
	return c.JSON(EmployeesResponse{Success: true, Data: employees})
}

func (h *Handler) CreateEmployee(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(EmployeeResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateEmployeeDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(EmployeeResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(EmployeeResponse{Success: false, Error: err.Error()})
	}
	emp, err := h.service.CreateEmployee(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(EmployeeResponse{Success: false, Error: "Failed to create employee"})
	}
	return c.Status(fiber.StatusCreated).JSON(EmployeeResponse{Success: true, Data: emp})
}

func (h *Handler) UpdateEmployee(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(EmployeeResponse{Success: false, Error: "Unauthorized"})
	}
	var dto UpdateEmployeeDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(EmployeeResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(EmployeeResponse{Success: false, Error: err.Error()})
	}
	emp, err := h.service.UpdateEmployee(c.Context(), shopID, c.Params("employeeId"), &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(EmployeeResponse{Success: false, Error: "Failed to update employee"})
	}
	return c.JSON(EmployeeResponse{Success: true, Data: emp})
}

func (h *Handler) DeleteEmployee(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(GenericResponse{Success: false, Error: "Unauthorized"})
	}
	if err := h.service.DeleteEmployee(c.Context(), shopID, c.Params("employeeId")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(GenericResponse{Success: false, Error: "Failed to delete employee"})
	}
	return c.JSON(GenericResponse{Success: true})
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

func (h *Handler) ListAttendance(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(AttendanceResponse{Success: false, Error: "Unauthorized"})
	}
	records, err := h.service.ListAttendance(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AttendanceResponse{Success: false, Error: "Failed to retrieve attendance"})
	}
	return c.JSON(AttendanceResponse{Success: true, Data: records})
}

func (h *Handler) CreateAttendance(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(AttendanceResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateAttendanceDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(AttendanceResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(AttendanceResponse{Success: false, Error: err.Error()})
	}
	rec, err := h.service.CreateAttendance(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(AttendanceResponse{Success: false, Error: "Failed to create attendance"})
	}
	return c.Status(fiber.StatusCreated).JSON(AttendanceResponse{Success: true, Data: []AttendanceRecord{*rec}})
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

func (h *Handler) ListPayroll(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PayrollResponse{Success: false, Error: "Unauthorized"})
	}
	records, err := h.service.ListPayroll(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PayrollResponse{Success: false, Error: "Failed to retrieve payroll"})
	}
	return c.JSON(PayrollResponse{Success: true, Data: records})
}

func (h *Handler) CreatePayroll(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(PayrollResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreatePayrollDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PayrollResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(PayrollResponse{Success: false, Error: err.Error()})
	}
	rec, err := h.service.CreatePayroll(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(PayrollResponse{Success: false, Error: "Failed to create payroll"})
	}
	return c.Status(fiber.StatusCreated).JSON(PayrollResponse{Success: true, Data: []PayrollRecord{*rec}})
}

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

func (h *Handler) ListLeaves(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(LeavesResponse{Success: false, Error: "Unauthorized"})
	}
	leaves, err := h.service.ListLeaves(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(LeavesResponse{Success: false, Error: "Failed to retrieve leaves"})
	}
	return c.JSON(LeavesResponse{Success: true, Data: leaves})
}

func (h *Handler) CreateLeave(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(LeaveResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateLeaveDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(LeaveResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(LeaveResponse{Success: false, Error: err.Error()})
	}
	leave, err := h.service.CreateLeave(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(LeaveResponse{Success: false, Error: "Failed to create leave"})
	}
	return c.Status(fiber.StatusCreated).JSON(LeaveResponse{Success: true, Data: leave})
}

func (h *Handler) UpdateLeaveStatus(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(LeaveResponse{Success: false, Error: "Unauthorized"})
	}
	var dto UpdateLeaveStatusDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(LeaveResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(LeaveResponse{Success: false, Error: err.Error()})
	}
	leave, err := h.service.UpdateLeaveStatus(c.Context(), shopID, c.Params("leaveId"), dto.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(LeaveResponse{Success: false, Error: "Failed to update leave"})
	}
	return c.JSON(LeaveResponse{Success: true, Data: leave})
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

func (h *Handler) ListTasks(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(TasksResponse{Success: false, Error: "Unauthorized"})
	}
	tasks, err := h.service.ListTasks(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TasksResponse{Success: false, Error: "Failed to retrieve tasks"})
	}
	return c.JSON(TasksResponse{Success: true, Data: tasks})
}

func (h *Handler) CreateTask(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(TaskResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateTaskDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TaskResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TaskResponse{Success: false, Error: err.Error()})
	}
	task, err := h.service.CreateTask(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TaskResponse{Success: false, Error: "Failed to create task"})
	}
	return c.Status(fiber.StatusCreated).JSON(TaskResponse{Success: true, Data: task})
}

func (h *Handler) UpdateTask(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(TaskResponse{Success: false, Error: "Unauthorized"})
	}
	var dto UpdateTaskDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TaskResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(TaskResponse{Success: false, Error: err.Error()})
	}
	task, err := h.service.UpdateTask(c.Context(), shopID, c.Params("taskId"), &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(TaskResponse{Success: false, Error: "Failed to update task"})
	}
	return c.JSON(TaskResponse{Success: true, Data: task})
}

func (h *Handler) DeleteTask(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(GenericResponse{Success: false, Error: "Unauthorized"})
	}
	if err := h.service.DeleteTask(c.Context(), shopID, c.Params("taskId")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(GenericResponse{Success: false, Error: "Failed to delete task"})
	}
	return c.JSON(GenericResponse{Success: true})
}

// ---------------------------------------------------------------------------
// CheckOuts
// ---------------------------------------------------------------------------

func (h *Handler) ListCheckOuts(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(CheckOutsResponse{Success: false, Error: "Unauthorized"})
	}
	records, err := h.service.ListCheckOuts(c.Context(), shopID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(CheckOutsResponse{Success: false, Error: "Failed to retrieve checkouts"})
	}
	return c.JSON(CheckOutsResponse{Success: true, Data: records})
}

func (h *Handler) CreateCheckOut(c *fiber.Ctx) error {
	shopID, ok := h.checkShopAccess(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(CheckOutsResponse{Success: false, Error: "Unauthorized"})
	}
	var dto CreateAttendanceDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(CheckOutsResponse{Success: false, Error: "Invalid request body"})
	}
	if err := dto.Validate(h.validate); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(CheckOutsResponse{Success: false, Error: err.Error()})
	}
	rec, err := h.service.CreateCheckOut(c.Context(), shopID, &dto)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(CheckOutsResponse{Success: false, Error: "Failed to create checkout"})
	}
	return c.Status(fiber.StatusCreated).JSON(CheckOutsResponse{Success: true, Data: []CheckOutRecord{*rec}})
}
