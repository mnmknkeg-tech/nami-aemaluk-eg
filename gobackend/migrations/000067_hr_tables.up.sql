-- HR domain tables: gobackend/internal/domains/hr/repository.go queries these
-- exact tables/columns (roles, role permissions, access logs, employees,
-- attendance, payroll, leaves, tasks, checkouts). Without them every
-- /api/v1/hr/* route 500s.

CREATE TABLE IF NOT EXISTS hr_roles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     text NOT NULL,
    name        text NOT NULL,
    name_ar     text NOT NULL DEFAULT '',
    color       text NOT NULL DEFAULT '',
    is_system   boolean NOT NULL DEFAULT FALSE,
    full_access boolean NOT NULL DEFAULT FALSE,
    status      text NOT NULL DEFAULT 'active',
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_roles_shop ON hr_roles (shop_id);

CREATE TABLE IF NOT EXISTS hr_role_permissions (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id   uuid NOT NULL REFERENCES hr_roles(id) ON DELETE CASCADE,
    module_id text NOT NULL,
    actions   text[] NOT NULL DEFAULT '{}',
    UNIQUE (role_id, module_id)
);

CREATE TABLE IF NOT EXISTS hr_access_logs (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id    text NOT NULL,
    actor      text NOT NULL DEFAULT '',
    action     text NOT NULL DEFAULT '',
    action_ar  text NOT NULL DEFAULT '',
    target     text NOT NULL DEFAULT '',
    details    text NOT NULL DEFAULT '',
    details_ar text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_access_logs_shop ON hr_access_logs (shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hr_employees (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id    text NOT NULL,
    name       text NOT NULL,
    email      text NOT NULL DEFAULT '',
    phone      text NOT NULL DEFAULT '',
    role       text NOT NULL DEFAULT '',
    role_id    uuid,
    status     text NOT NULL DEFAULT 'active',
    salary     numeric(12,2) NOT NULL DEFAULT 0,
    hire_date  date,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_employees_shop ON hr_employees (shop_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_role ON hr_employees (shop_id, role_id);

CREATE TABLE IF NOT EXISTS hr_attendance (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       text NOT NULL,
    employee_id   uuid,
    employee_name text NOT NULL DEFAULT '',
    date          date NOT NULL DEFAULT CURRENT_DATE,
    check_in      text NOT NULL DEFAULT '',
    check_out     text NOT NULL DEFAULT '',
    hours         text NOT NULL DEFAULT '',
    status        text NOT NULL DEFAULT 'present',
    created_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_shop ON hr_attendance (shop_id, date DESC);

CREATE TABLE IF NOT EXISTS hr_payroll (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       text NOT NULL,
    employee_id   uuid,
    employee_name text NOT NULL DEFAULT '',
    amount        numeric(12,2) NOT NULL DEFAULT 0,
    period        text NOT NULL DEFAULT '',
    status        text NOT NULL DEFAULT 'paid',
    paid_at       timestamptz,
    created_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_shop ON hr_payroll (shop_id);

CREATE TABLE IF NOT EXISTS hr_leaves (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       text NOT NULL,
    employee_name text NOT NULL,
    type          text NOT NULL DEFAULT 'annual',
    start_date    date NOT NULL,
    end_date      date NOT NULL,
    days          int NOT NULL DEFAULT 1,
    reason        text NOT NULL DEFAULT '',
    status        text NOT NULL DEFAULT 'pending',
    created_at    timestamptz NOT NULL DEFAULT NOW(),
    updated_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_shop ON hr_leaves (shop_id);

CREATE TABLE IF NOT EXISTS hr_tasks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     text NOT NULL,
    title       text NOT NULL,
    assignee    text NOT NULL DEFAULT '',
    priority    text NOT NULL DEFAULT 'medium',
    status      text NOT NULL DEFAULT 'todo',
    due_date    date,
    description text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT NOW(),
    updated_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_tasks_shop ON hr_tasks (shop_id);

CREATE TABLE IF NOT EXISTS hr_checkouts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       text NOT NULL,
    employee_name text NOT NULL DEFAULT '',
    date          date NOT NULL DEFAULT CURRENT_DATE,
    check_in      text NOT NULL DEFAULT '',
    check_out     text NOT NULL DEFAULT '',
    hours         text NOT NULL DEFAULT '',
    status        text NOT NULL DEFAULT 'present',
    created_at    timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_checkouts_shop ON hr_checkouts (shop_id, date DESC);
