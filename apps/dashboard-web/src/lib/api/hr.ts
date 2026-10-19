/**
 * HR API module — كل نداءات الموارد البشرية تمتد من هنا.
 * الباكند: gobackend/internal/domains/hr (handler.go) — كل المسارات تحت
 * /api/v1/hr/shops/:shopId/* وتحتاج توكن JWT + صلاحية على المتجر.
 */
import { apiRequest } from './client';

// ---------------------------------------------------------------------------
// Types — مطابقة لـ gobackend/internal/domains/hr/types.go
// ---------------------------------------------------------------------------

export type HrRolePermission = { moduleId: string; actions: string[] };

export type HrRole = {
  id: string;
  shop_id: string;
  name: string;
  name_ar: string;
  color: string;
  is_system: boolean;
  full_access: boolean;
  status: string; // 'active' | 'inactive'
  permissions: HrRolePermission[];
  users: number;
  created_at: string;
};

export type HrAccessLog = {
  id: string;
  shop_id: string;
  actor: string;
  action: string;
  action_ar: string;
  target: string;
  details: string;
  details_ar: string;
  timestamp: string;
};

export type HrEmployee = {
  id: string;
  shop_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  role_id: string;
  status: string; // 'active' | 'inactive'
  salary: number;
  hire_date: string; // 'YYYY-MM-DD' أو ''
  created_at: string;
};

export type HrAttendanceStatus = 'present' | 'late' | 'absent';

export type HrAttendanceRecord = {
  id: string;
  shop_id: string;
  employee_id: string;
  employeeName: string;
  date: string; // 'YYYY-MM-DD'
  checkIn: string;
  checkOut: string;
  hours: string;
  status: HrAttendanceStatus | string;
};

export type HrPayrollStatus = 'paid' | 'pending';

export type HrPayrollRecord = {
  id: string;
  shop_id: string;
  employee_id: string;
  employeeName: string;
  amount: number;
  period: string;
  status: HrPayrollStatus | string;
  paid_at: string;
};

export type HrLeaveType = 'annual' | 'sick' | 'unpaid' | 'emergency';
export type HrLeaveStatus = 'pending' | 'approved' | 'rejected';

export type HrLeave = {
  id: string;
  shop_id: string;
  employeeName: string;
  type: HrLeaveType | string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;
  days: number;
  reason: string;
  status: HrLeaveStatus | string;
  created_at: string;
};

export type HrTaskPriority = 'low' | 'medium' | 'high';
export type HrTaskStatus = 'todo' | 'inProgress' | 'done';

export type HrTask = {
  id: string;
  shop_id: string;
  title: string;
  assignee: string;
  priority: HrTaskPriority | string;
  status: HrTaskStatus | string;
  dueDate: string; // 'YYYY-MM-DD' أو ''
  description: string;
  created_at: string;
};

export type HrCheckOutRecord = {
  id: string;
  shop_id: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: HrAttendanceStatus | string;
};

const base = (shopId: string) => `/hr/shops/${shopId}`;

const list = async <T>(shopId: string, path: string): Promise<T[]> => {
  const data = await apiRequest<T[]>(`${base(shopId)}${path}`);
  return Array.isArray(data) ? data : [];
};

// ---------------------------------------------------------------------------
// Employees — CRUD كامل
// ---------------------------------------------------------------------------

export type HrEmployeePayload = {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  role_id?: string;
  status?: string;
  salary?: number;
  hire_date?: string;
};

export const fetchEmployees = (shopId: string) => list<HrEmployee>(shopId, '/employees');

export const createEmployee = (shopId: string, body: HrEmployeePayload) =>
  apiRequest<HrEmployee>(`${base(shopId)}/employees`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateEmployee = (shopId: string, employeeId: string, body: Partial<HrEmployeePayload>) =>
  apiRequest<HrEmployee>(`${base(shopId)}/employees/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteEmployee = (shopId: string, employeeId: string) =>
  apiRequest(`${base(shopId)}/employees/${employeeId}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export type HrRolePayload = {
  name: string;
  name_ar?: string;
  color?: string;
  full_access?: boolean;
  status?: string;
  permissions?: HrRolePermission[];
};

export const fetchRoles = (shopId: string) => list<HrRole>(shopId, '/roles');

export const fetchRole = (shopId: string, roleId: string) =>
  apiRequest<HrRole>(`${base(shopId)}/roles/${roleId}`);

export const createRole = (shopId: string, body: HrRolePayload) =>
  apiRequest<HrRole>(`${base(shopId)}/roles`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateRole = (shopId: string, roleId: string, body: Partial<HrRolePayload>) =>
  apiRequest<HrRole>(`${base(shopId)}/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteRole = (shopId: string, roleId: string) =>
  apiRequest(`${base(shopId)}/roles/${roleId}`, { method: 'DELETE' });

export const fetchAccessLogs = (shopId: string, limit = 50) =>
  list<HrAccessLog>(shopId, `/access-logs?limit=${limit}`);

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export type HrAttendancePayload = {
  employee_id?: string;
  employeeName?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  hours?: string;
  status?: HrAttendanceStatus;
};

export const fetchAttendance = (shopId: string) => list<HrAttendanceRecord>(shopId, '/attendance');

export const createAttendance = (shopId: string, body: HrAttendancePayload) =>
  apiRequest<HrAttendanceRecord[]>(`${base(shopId)}/attendance`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export type HrPayrollPayload = {
  employee_id?: string;
  employeeName?: string;
  amount: number;
  period?: string;
  status?: HrPayrollStatus;
};

export const fetchPayroll = (shopId: string) => list<HrPayrollRecord>(shopId, '/payroll');

export const createPayroll = (shopId: string, body: HrPayrollPayload) =>
  apiRequest<HrPayrollRecord[]>(`${base(shopId)}/payroll`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

export type HrLeavePayload = {
  employeeName: string;
  type?: HrLeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
};

export const fetchLeaves = (shopId: string) => list<HrLeave>(shopId, '/leaves');

export const createLeave = (shopId: string, body: HrLeavePayload) =>
  apiRequest<HrLeave>(`${base(shopId)}/leaves`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateLeaveStatus = (shopId: string, leaveId: string, status: HrLeaveStatus) =>
  apiRequest<HrLeave>(`${base(shopId)}/leaves/${leaveId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ---------------------------------------------------------------------------
// Tasks — CRUD كامل
// ---------------------------------------------------------------------------

export type HrTaskPayload = {
  title: string;
  assignee?: string;
  priority?: HrTaskPriority;
  status?: HrTaskStatus;
  dueDate?: string;
  description?: string;
};

export const fetchTasks = (shopId: string) => list<HrTask>(shopId, '/tasks');

export const createTask = (shopId: string, body: HrTaskPayload) =>
  apiRequest<HrTask>(`${base(shopId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateTask = (shopId: string, taskId: string, body: Partial<HrTaskPayload>) =>
  apiRequest<HrTask>(`${base(shopId)}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

export const deleteTask = (shopId: string, taskId: string) =>
  apiRequest(`${base(shopId)}/tasks/${taskId}`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Checkouts (الانصراف)
// ---------------------------------------------------------------------------

export const fetchCheckOuts = (shopId: string) => list<HrCheckOutRecord>(shopId, '/checkouts');

export const createCheckOut = (shopId: string, body: HrAttendancePayload) =>
  apiRequest<HrCheckOutRecord[]>(`${base(shopId)}/checkouts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
