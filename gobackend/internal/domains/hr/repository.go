package hr

import (
	"context"
	"fmt"
	"time"

	"github.com/Sayedtaha55/ray-eg/gobackend/internal/platform/db"
	"github.com/jackc/pgx/v5/pgtype"
)

// Repository handles database operations for the HR module
type Repository struct {
	pool *db.Pool
}

// NewRepository creates a new HR repository
func NewRepository(pool *db.Pool) *Repository {
	return &Repository{pool: pool}
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

// ListRoles retrieves all roles for a shop with their permissions and user counts
func (r *Repository) ListRoles(ctx context.Context, shopID string) ([]Role, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, name, COALESCE(name_ar,''), color, is_system, full_access, status, created_at
		 FROM hr_roles WHERE shop_id = $1 ORDER BY created_at ASC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list roles: %w", err)
	}
	defer rows.Close()

	roles := make([]Role, 0)
	for rows.Next() {
		var role Role
		var createdAt time.Time
		if err := rows.Scan(&role.ID, &role.ShopID, &role.Name, &role.NameAr, &role.Color,
			&role.IsSystem, &role.FullAccess, &role.Status, &createdAt); err != nil {
			continue
		}
		role.CreatedAt = createdAt.Format(time.RFC3339)
		role.Permissions = []RolePermission{}
		roles = append(roles, role)
	}

	// Load permissions for each role
	for i := range roles {
		perms, err := r.listRolePermissions(ctx, roles[i].ID)
		if err == nil {
			roles[i].Permissions = perms
		}
		// Count users assigned to this role
		var count int64
		_ = r.pool.QueryRow(ctx,
			"SELECT COUNT(*) FROM hr_employees WHERE shop_id = $1 AND role_id = $2",
			shopID, roles[i].ID).Scan(&count)
		roles[i].Users = count
	}

	return roles, nil
}

func (r *Repository) listRolePermissions(ctx context.Context, roleID string) ([]RolePermission, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT module_id, actions FROM hr_role_permissions WHERE role_id = $1", roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	perms := make([]RolePermission, 0)
	for rows.Next() {
		var p RolePermission
		var actions []string
		if err := rows.Scan(&p.ModuleID, &actions); err != nil {
			continue
		}
		p.Actions = actions
		perms = append(perms, p)
	}
	return perms, nil
}

// GetRole retrieves a single role by ID scoped to its shop.
func (r *Repository) GetRole(ctx context.Context, shopID, roleID string) (*Role, error) {
	var role Role
	var createdAt time.Time
	query := `SELECT id, shop_id, name, COALESCE(name_ar,''), color, is_system, full_access, status, created_at
		 FROM hr_roles WHERE id = $1`
	args := []any{roleID}
	if shopID != "" {
		query += ` AND shop_id = $2`
		args = append(args, shopID)
	}
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&role.ID, &role.ShopID, &role.Name, &role.NameAr, &role.Color,
			&role.IsSystem, &role.FullAccess, &role.Status, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("role not found: %w", err)
	}
	role.CreatedAt = createdAt.Format(time.RFC3339)
	role.Permissions = []RolePermission{}
	perms, _ := r.listRolePermissions(ctx, role.ID)
	role.Permissions = perms
	return &role, nil
}

// CreateRole creates a new role
func (r *Repository) CreateRole(ctx context.Context, shopID string, dto *CreateRoleDTO) (*Role, error) {
	var role Role
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_roles (shop_id, name, name_ar, color, is_system, full_access, status)
		 VALUES ($1, $2, $3, COALESCE($4,'bg-blue-50 text-blue-600'), FALSE, $5, 'active')
		 RETURNING id, shop_id, name, COALESCE(name_ar,''), color, is_system, full_access, status, created_at`,
		shopID, dto.Name, dto.NameAr, dto.Color, dto.FullAccess).
		Scan(&role.ID, &role.ShopID, &role.Name, &role.NameAr, &role.Color,
			&role.IsSystem, &role.FullAccess, &role.Status, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}
	role.CreatedAt = createdAt.Format(time.RFC3339)
	role.Permissions = []RolePermission{}

	// Insert permissions
	for _, p := range dto.Permissions {
		if p.ModuleID == "" {
			continue
		}
		_, _ = r.pool.Exec(ctx,
			`INSERT INTO hr_role_permissions (role_id, module_id, actions) VALUES ($1, $2, $3)
			 ON CONFLICT (role_id, module_id) DO UPDATE SET actions = $3`,
			role.ID, p.ModuleID, p.Actions)
		role.Permissions = append(role.Permissions, p)
	}
	return &role, nil
}

// UpdateRole updates a role scoped to its owning shop.
func (r *Repository) UpdateRole(ctx context.Context, shopID, roleID string, dto *UpdateRoleDTO) (*Role, error) {
	// Ownership gate: verify the role belongs to this shop before touching
	// the role or its permission rows (the permission INSERT below has no
	// shop column, so the filter on hr_roles alone would not stop it).
	if _, err := r.GetRole(ctx, shopID, roleID); err != nil {
		return nil, err
	}
	shop := " AND shop_id = $%d"
	next := 3
	if dto.Name != nil {
		if _, err := r.pool.Exec(ctx, "UPDATE hr_roles SET name = $2, updated_at = NOW() WHERE id = $1"+fmt.Sprintf(shop, next), roleID, *dto.Name, shopID); err != nil {
			return nil, err
		}
	}
	if dto.NameAr != nil {
		if _, err := r.pool.Exec(ctx, "UPDATE hr_roles SET name_ar = $2, updated_at = NOW() WHERE id = $1"+fmt.Sprintf(shop, next), roleID, *dto.NameAr, shopID); err != nil {
			return nil, err
		}
	}
	if dto.Color != nil {
		if _, err := r.pool.Exec(ctx, "UPDATE hr_roles SET color = $2, updated_at = NOW() WHERE id = $1"+fmt.Sprintf(shop, next), roleID, *dto.Color, shopID); err != nil {
			return nil, err
		}
	}
	if dto.FullAccess != nil {
		if _, err := r.pool.Exec(ctx, "UPDATE hr_roles SET full_access = $2, updated_at = NOW() WHERE id = $1"+fmt.Sprintf(shop, next), roleID, *dto.FullAccess, shopID); err != nil {
			return nil, err
		}
		if *dto.FullAccess {
			_, _ = r.pool.Exec(ctx, "DELETE FROM hr_role_permissions WHERE role_id = $1 AND EXISTS (SELECT 1 FROM hr_roles WHERE id = $1 AND shop_id = $2)", roleID, shopID)
		}
	}
	if dto.Status != nil {
		if _, err := r.pool.Exec(ctx, "UPDATE hr_roles SET status = $2, updated_at = NOW() WHERE id = $1"+fmt.Sprintf(shop, next), roleID, *dto.Status, shopID); err != nil {
			return nil, err
		}
	}
	if dto.Permissions != nil {
		_, _ = r.pool.Exec(ctx, "DELETE FROM hr_role_permissions WHERE role_id = $1 AND EXISTS (SELECT 1 FROM hr_roles WHERE id = $1 AND shop_id = $2)", roleID, shopID)
		for _, p := range *dto.Permissions {
			if p.ModuleID == "" || len(p.Actions) == 0 {
				continue
			}
			_, _ = r.pool.Exec(ctx,
				`INSERT INTO hr_role_permissions (role_id, module_id, actions) VALUES ($1, $2, $3)
				 ON CONFLICT (role_id, module_id) DO UPDATE SET actions = $3`,
				roleID, p.ModuleID, p.Actions)
		}
	}
	return r.GetRole(ctx, shopID, roleID)
}

// DeleteRole deletes a role (system roles cannot be deleted), scoped to its shop.
func (r *Repository) DeleteRole(ctx context.Context, shopID, roleID string) error {
	var isSystem bool
	err := r.pool.QueryRow(ctx, "SELECT is_system FROM hr_roles WHERE id = $1 AND shop_id = $2", roleID, shopID).Scan(&isSystem)
	if err != nil {
		return err
	}
	if isSystem {
		return fmt.Errorf("system roles cannot be deleted")
	}
	_, err = r.pool.Exec(ctx, "DELETE FROM hr_roles WHERE id = $1 AND shop_id = $2", roleID, shopID)
	return err
}

// ---------------------------------------------------------------------------
// Access Logs
// ---------------------------------------------------------------------------

// ListAccessLogs retrieves access logs for a shop
func (r *Repository) ListAccessLogs(ctx context.Context, shopID string, limit int) ([]AccessLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, actor, action, COALESCE(action_ar,''), COALESCE(target,''),
		        COALESCE(details,''), COALESCE(details_ar,''), created_at
		 FROM hr_access_logs WHERE shop_id = $1 ORDER BY created_at DESC LIMIT $2`,
		shopID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list access logs: %w", err)
	}
	defer rows.Close()

	logs := make([]AccessLog, 0)
	for rows.Next() {
		var l AccessLog
		var createdAt time.Time
		if err := rows.Scan(&l.ID, &l.ShopID, &l.Actor, &l.Action, &l.ActionAr,
			&l.Target, &l.Details, &l.DetailsAr, &createdAt); err != nil {
			continue
		}
		l.Timestamp = createdAt.Format(time.RFC3339)
		logs = append(logs, l)
	}
	return logs, nil
}

// AddAccessLog creates a new access log entry
func (r *Repository) AddAccessLog(ctx context.Context, shopID, actor, action, actionAr, target, details, detailsAr string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO hr_access_logs (shop_id, actor, action, action_ar, target, details, details_ar)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		shopID, actor, action, actionAr, target, details, detailsAr)
	return err
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

// ListEmployees retrieves all employees for a shop
func (r *Repository) ListEmployees(ctx context.Context, shopID string) ([]Employee, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(role,''),
		        COALESCE(role_id::text,''), status, salary, COALESCE(hire_date::text,''), created_at
		 FROM hr_employees WHERE shop_id = $1 ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list employees: %w", err)
	}
	defer rows.Close()

	employees := make([]Employee, 0)
	for rows.Next() {
		var e Employee
		var createdAt time.Time
		if err := rows.Scan(&e.ID, &e.ShopID, &e.Name, &e.Email, &e.Phone, &e.Role,
			&e.RoleID, &e.Status, &e.Salary, &e.HireDate, &createdAt); err != nil {
			continue
		}
		e.CreatedAt = createdAt.Format(time.RFC3339)
		employees = append(employees, e)
	}
	return employees, nil
}

// CreateEmployee creates a new employee
func (r *Repository) CreateEmployee(ctx context.Context, shopID string, dto *CreateEmployeeDTO) (*Employee, error) {
	status := dto.Status
	if status == "" {
		status = "active"
	}
	var e Employee
	var createdAt time.Time
	var roleID pgtype.Text
	if dto.RoleID != "" {
		_ = roleID.Scan(dto.RoleID)
	}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_employees (shop_id, name, email, phone, role, role_id, status, salary, hire_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9,'')::date)
		 RETURNING id, shop_id, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(role,''),
		           COALESCE(role_id::text,''), status, salary, COALESCE(hire_date::text,''), created_at`,
		shopID, dto.Name, dto.Email, dto.Phone, dto.Role, roleID, status, dto.Salary, dto.HireDate).
		Scan(&e.ID, &e.ShopID, &e.Name, &e.Email, &e.Phone, &e.Role,
			&e.RoleID, &e.Status, &e.Salary, &e.HireDate, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create employee: %w", err)
	}
	e.CreatedAt = createdAt.Format(time.RFC3339)
	return &e, nil
}

// UpdateEmployee updates an employee scoped to its owning shop.
func (r *Repository) UpdateEmployee(ctx context.Context, shopID, employeeID string, dto *UpdateEmployeeDTO) (*Employee, error) {
	scoped := " AND shop_id = $3"
	if dto.Name != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET name = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Name, shopID)
	}
	if dto.Email != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET email = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Email, shopID)
	}
	if dto.Phone != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET phone = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Phone, shopID)
	}
	if dto.Role != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET role = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Role, shopID)
	}
	if dto.Status != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET status = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Status, shopID)
	}
	if dto.Salary != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET salary = $2, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.Salary, shopID)
	}
	if dto.HireDate != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_employees SET hire_date = NULLIF($2,'')::date, updated_at = NOW() WHERE id = $1"+scoped, employeeID, *dto.HireDate, shopID)
	}

	var e Employee
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT id, shop_id, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(role,''),
		        COALESCE(role_id::text,''), status, salary, COALESCE(hire_date::text,''), created_at
		 FROM hr_employees WHERE id = $1 AND shop_id = $2`, employeeID, shopID).
		Scan(&e.ID, &e.ShopID, &e.Name, &e.Email, &e.Phone, &e.Role,
			&e.RoleID, &e.Status, &e.Salary, &e.HireDate, &createdAt)
	if err != nil {
		return nil, err
	}
	e.CreatedAt = createdAt.Format(time.RFC3339)
	return &e, nil
}

// DeleteEmployee deletes an employee scoped to its owning shop.
func (r *Repository) DeleteEmployee(ctx context.Context, shopID, employeeID string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM hr_employees WHERE id = $1 AND shop_id = $2", employeeID, shopID)
	return err
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

// ListAttendance retrieves attendance records for a shop
func (r *Repository) ListAttendance(ctx context.Context, shopID string) ([]AttendanceRecord, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, COALESCE(employee_id::text,''), COALESCE(employee_name,''),
		        COALESCE(date::text,''), COALESCE(check_in,''), COALESCE(check_out,''),
		        COALESCE(hours,''), status
		 FROM hr_attendance WHERE shop_id = $1 ORDER BY date DESC, created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list attendance: %w", err)
	}
	defer rows.Close()

	records := make([]AttendanceRecord, 0)
	for rows.Next() {
		var a AttendanceRecord
		if err := rows.Scan(&a.ID, &a.ShopID, &a.EmployeeID, &a.EmployeeName,
			&a.Date, &a.CheckIn, &a.CheckOut, &a.Hours, &a.Status); err != nil {
			continue
		}
		records = append(records, a)
	}
	return records, nil
}

// CreateAttendance creates an attendance record
func (r *Repository) CreateAttendance(ctx context.Context, shopID string, dto *CreateAttendanceDTO) (*AttendanceRecord, error) {
	date := dto.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	status := dto.Status
	if status == "" {
		status = "present"
	}
	var a AttendanceRecord
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_attendance (shop_id, employee_id, employee_name, date, check_in, check_out, hours, status)
		 VALUES ($1, NULLIF($2,'')::uuid, $3, $4::date, $5, $6, $7, $8)
		 RETURNING id, shop_id, COALESCE(employee_id::text,''), COALESCE(employee_name,''),
		           COALESCE(date::text,''), COALESCE(check_in,''), COALESCE(check_out,''),
		           COALESCE(hours,''), status`,
		shopID, dto.EmployeeID, dto.EmployeeName, date, dto.CheckIn, dto.CheckOut, dto.Hours, status).
		Scan(&a.ID, &a.ShopID, &a.EmployeeID, &a.EmployeeName,
			&a.Date, &a.CheckIn, &a.CheckOut, &a.Hours, &a.Status)
	if err != nil {
		return nil, fmt.Errorf("failed to create attendance: %w", err)
	}
	return &a, nil
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

// ListPayroll retrieves payroll records for a shop
func (r *Repository) ListPayroll(ctx context.Context, shopID string) ([]PayrollRecord, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, COALESCE(employee_id::text,''), COALESCE(employee_name,''),
		        amount, COALESCE(period,''), status, COALESCE(paid_at::text,'')
		 FROM hr_payroll WHERE shop_id = $1 ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list payroll: %w", err)
	}
	defer rows.Close()

	records := make([]PayrollRecord, 0)
	for rows.Next() {
		var p PayrollRecord
		if err := rows.Scan(&p.ID, &p.ShopID, &p.EmployeeID, &p.EmployeeName,
			&p.Amount, &p.Period, &p.Status, &p.PaidAt); err != nil {
			continue
		}
		records = append(records, p)
	}
	return records, nil
}

// CreatePayroll creates a payroll record
func (r *Repository) CreatePayroll(ctx context.Context, shopID string, dto *CreatePayrollDTO) (*PayrollRecord, error) {
	status := dto.Status
	if status == "" {
		status = "paid"
	}
	var p PayrollRecord
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_payroll (shop_id, employee_id, employee_name, amount, period, status, paid_at)
		 VALUES ($1, NULLIF($2,'')::uuid, $3, $4, $5, $6, CASE WHEN $6 = 'paid' THEN NOW() ELSE NULL END)
		 RETURNING id, shop_id, COALESCE(employee_id::text,''), COALESCE(employee_name,''),
		           amount, COALESCE(period,''), status, COALESCE(paid_at::text,'')`,
		shopID, dto.EmployeeID, dto.EmployeeName, dto.Amount, dto.Period, status).
		Scan(&p.ID, &p.ShopID, &p.EmployeeID, &p.EmployeeName,
			&p.Amount, &p.Period, &p.Status, &p.PaidAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create payroll: %w", err)
	}
	return &p, nil
}

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

// ListLeaves retrieves leave requests for a shop
func (r *Repository) ListLeaves(ctx context.Context, shopID string) ([]Leave, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, employee_name, type, start_date::text, end_date::text,
		        days, COALESCE(reason,''), status, created_at
		 FROM hr_leaves WHERE shop_id = $1 ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list leaves: %w", err)
	}
	defer rows.Close()

	leaves := make([]Leave, 0)
	for rows.Next() {
		var l Leave
		var createdAt time.Time
		if err := rows.Scan(&l.ID, &l.ShopID, &l.EmployeeName, &l.Type, &l.StartDate,
			&l.EndDate, &l.Days, &l.Reason, &l.Status, &createdAt); err != nil {
			continue
		}
		l.CreatedAt = createdAt.Format(time.RFC3339)
		leaves = append(leaves, l)
	}
	return leaves, nil
}

// CreateLeave creates a leave request
func (r *Repository) CreateLeave(ctx context.Context, shopID string, dto *CreateLeaveDTO) (*Leave, error) {
	leaveType := dto.Type
	if leaveType == "" {
		leaveType = "annual"
	}
	start, err := time.Parse("2006-01-02", dto.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date: %w", err)
	}
	end, err := time.Parse("2006-01-02", dto.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end_date: %w", err)
	}
	days := int(end.Sub(start).Hours()/24) + 1
	if days < 1 {
		days = 1
	}

	var l Leave
	var createdAt time.Time
	err = r.pool.QueryRow(ctx,
		`INSERT INTO hr_leaves (shop_id, employee_name, type, start_date, end_date, days, reason, status)
		 VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, 'pending')
		 RETURNING id, shop_id, employee_name, type, start_date::text, end_date::text,
		           days, COALESCE(reason,''), status, created_at`,
		shopID, dto.EmployeeName, leaveType, dto.StartDate, dto.EndDate, days, dto.Reason).
		Scan(&l.ID, &l.ShopID, &l.EmployeeName, &l.Type, &l.StartDate,
			&l.EndDate, &l.Days, &l.Reason, &l.Status, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave: %w", err)
	}
	l.CreatedAt = createdAt.Format(time.RFC3339)
	return &l, nil
}

// UpdateLeaveStatus updates the status of a leave request scoped to its shop.
func (r *Repository) UpdateLeaveStatus(ctx context.Context, shopID, leaveID, status string) (*Leave, error) {
	var l Leave
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`UPDATE hr_leaves SET status = $3, updated_at = NOW()
		 WHERE id = $1 AND shop_id = $2
		 RETURNING id, shop_id, employee_name, type, start_date::text, end_date::text,
		           days, COALESCE(reason,''), status, created_at`,
		leaveID, shopID, status).
		Scan(&l.ID, &l.ShopID, &l.EmployeeName, &l.Type, &l.StartDate,
			&l.EndDate, &l.Days, &l.Reason, &l.Status, &createdAt)
	if err != nil {
		return nil, err
	}
	l.CreatedAt = createdAt.Format(time.RFC3339)
	return &l, nil
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

// ListTasks retrieves tasks for a shop
func (r *Repository) ListTasks(ctx context.Context, shopID string) ([]Task, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, title, COALESCE(assignee,''), priority, status,
		        COALESCE(due_date::text,''), COALESCE(description,''), created_at
		 FROM hr_tasks WHERE shop_id = $1 ORDER BY created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer rows.Close()

	tasks := make([]Task, 0)
	for rows.Next() {
		var t Task
		var createdAt time.Time
		if err := rows.Scan(&t.ID, &t.ShopID, &t.Title, &t.Assignee, &t.Priority,
			&t.Status, &t.DueDate, &t.Description, &createdAt); err != nil {
			continue
		}
		t.CreatedAt = createdAt.Format(time.RFC3339)
		tasks = append(tasks, t)
	}
	return tasks, nil
}

// CreateTask creates a new task
func (r *Repository) CreateTask(ctx context.Context, shopID string, dto *CreateTaskDTO) (*Task, error) {
	priority := dto.Priority
	if priority == "" {
		priority = "medium"
	}
	status := dto.Status
	if status == "" {
		status = "todo"
	}
	var t Task
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_tasks (shop_id, title, assignee, priority, status, due_date, description)
		 VALUES ($1, $2, $3, $4, $5, NULLIF($6,'')::date, $7)
		 RETURNING id, shop_id, title, COALESCE(assignee,''), priority, status,
		           COALESCE(due_date::text,''), COALESCE(description,''), created_at`,
		shopID, dto.Title, dto.Assignee, priority, status, dto.DueDate, dto.Description).
		Scan(&t.ID, &t.ShopID, &t.Title, &t.Assignee, &t.Priority,
			&t.Status, &t.DueDate, &t.Description, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}
	t.CreatedAt = createdAt.Format(time.RFC3339)
	return &t, nil
}

// UpdateTask updates a task scoped to its owning shop.
func (r *Repository) UpdateTask(ctx context.Context, shopID, taskID string, dto *UpdateTaskDTO) (*Task, error) {
	scoped := " AND shop_id = $3"
	if dto.Title != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET title = $2, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.Title, shopID)
	}
	if dto.Assignee != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET assignee = $2, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.Assignee, shopID)
	}
	if dto.Priority != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET priority = $2, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.Priority, shopID)
	}
	if dto.Status != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET status = $2, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.Status, shopID)
	}
	if dto.DueDate != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET due_date = NULLIF($2,'')::date, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.DueDate, shopID)
	}
	if dto.Description != nil {
		_, _ = r.pool.Exec(ctx, "UPDATE hr_tasks SET description = $2, updated_at = NOW() WHERE id = $1"+scoped, taskID, *dto.Description, shopID)
	}

	var t Task
	var createdAt time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT id, shop_id, title, COALESCE(assignee,''), priority, status,
		        COALESCE(due_date::text,''), COALESCE(description,''), created_at
		 FROM hr_tasks WHERE id = $1 AND shop_id = $2`, taskID, shopID).
		Scan(&t.ID, &t.ShopID, &t.Title, &t.Assignee, &t.Priority,
			&t.Status, &t.DueDate, &t.Description, &createdAt)
	if err != nil {
		return nil, err
	}
	t.CreatedAt = createdAt.Format(time.RFC3339)
	return &t, nil
}

// DeleteTask deletes a task scoped to its owning shop.
func (r *Repository) DeleteTask(ctx context.Context, shopID, taskID string) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM hr_tasks WHERE id = $1 AND shop_id = $2", taskID, shopID)
	return err
}

// ---------------------------------------------------------------------------
// CheckOuts
// ---------------------------------------------------------------------------

// ListCheckOuts retrieves check-in/check-out records for a shop
func (r *Repository) ListCheckOuts(ctx context.Context, shopID string) ([]CheckOutRecord, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, employee_name, COALESCE(date::text,''),
		        COALESCE(check_in,''), COALESCE(check_out,''), COALESCE(hours,''), status
		 FROM hr_checkouts WHERE shop_id = $1 ORDER BY date DESC, created_at DESC`, shopID)
	if err != nil {
		return nil, fmt.Errorf("failed to list checkouts: %w", err)
	}
	defer rows.Close()

	records := make([]CheckOutRecord, 0)
	for rows.Next() {
		var c CheckOutRecord
		if err := rows.Scan(&c.ID, &c.ShopID, &c.EmployeeName, &c.Date,
			&c.CheckIn, &c.CheckOut, &c.Hours, &c.Status); err != nil {
			continue
		}
		records = append(records, c)
	}
	return records, nil
}

// CreateCheckOut creates a check-in/check-out record
func (r *Repository) CreateCheckOut(ctx context.Context, shopID string, dto *CreateAttendanceDTO) (*CheckOutRecord, error) {
	date := dto.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	status := dto.Status
	if status == "" {
		status = "present"
	}
	var c CheckOutRecord
	err := r.pool.QueryRow(ctx,
		`INSERT INTO hr_checkouts (shop_id, employee_name, date, check_in, check_out, hours, status)
		 VALUES ($1, $2, $3::date, $4, $5, $6, $7)
		 RETURNING id, shop_id, employee_name, COALESCE(date::text,''),
		           COALESCE(check_in,''), COALESCE(check_out,''), COALESCE(hours,''), status`,
		shopID, dto.EmployeeName, date, dto.CheckIn, dto.CheckOut, dto.Hours, status).
		Scan(&c.ID, &c.ShopID, &c.EmployeeName, &c.Date,
			&c.CheckIn, &c.CheckOut, &c.Hours, &c.Status)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout: %w", err)
	}
	return &c, nil
}
