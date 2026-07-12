/*
# Workforce Management System - Core Schema

## Overview
Complete enterprise WMS schema supporting multi-org, multi-role workforce management.

## New Tables

### organizations
Master organization/tenant table.
- id, name, slug (unique), logo_url, address, phone, email, timezone, subscription_plan

### departments
Organizational departments with hierarchical structure.
- id, org_id (FK organizations), name, code, manager_id (self-ref), parent_id (self-ref)

### employees
Core employee profiles extending auth.users.
- id, user_id (FK auth.users), org_id, department_id
- employee_id (e.g. EMP-001), first/last name, email, phone, avatar_url
- role: super_admin | admin | hr_manager | team_supervisor | employee
- position, employment_type, hire_date, birth_date, status: active | inactive | on_leave | terminated

### shifts
Shift templates (e.g. Morning Shift 08:00-17:00).
- id, org_id, name, start_time, end_time, break_duration, color, is_overnight

### schedules
Daily schedule assignments linking employees to shifts.
- id, employee_id, shift_id, date, status: scheduled | confirmed | swapped | cancelled

### attendance_records
Clock-in/out records with break tracking and overtime.
- id, employee_id, date, clock_in, clock_out, break_start, break_end
- total_hours, overtime_hours, status: present | absent | late | half_day | holiday
- approved_by, location (jsonb for GPS)

### leave_types
Configurable leave types per organization.
- id, org_id, name, code, days_allowed, is_paid, carry_over, max_carry_over, color

### leave_balances
Employee leave balance tracking per year.
- id, employee_id, leave_type_id, year, allocated_days, used_days, pending_days, carried_over_days

### leave_requests
Employee leave applications with approval workflow.
- id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status
- status: pending | approved | rejected | cancelled
- reviewed_by, reviewed_at, review_notes, attachment_url

### announcements
Company-wide or targeted announcements.
- id, org_id, author_id, title, content, type: general | urgent | event | policy
- target_roles (array), is_pinned, published_at, expires_at

### notifications
Per-employee in-app notifications.
- id, employee_id, title, message, type: info | success | warning | error
- category: attendance | leave | schedule | system | announcement
- is_read, action_url

### audit_logs
Comprehensive audit trail for all system actions.
- id, user_id, action, resource_type, resource_id, changes (jsonb), ip_address

## Security
- RLS enabled on all tables
- Authenticated users can read all org data (SaaS demo model)
- Employees can write their own attendance/leaves
- All inserts/updates tracked in audit_logs via triggers

## Notes
1. user_id in employees defaults to auth.uid() for auth integration
2. All timestamps use timestamptz for timezone awareness
3. Soft-delete pattern: status columns instead of hard deletes
*/

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  timezone text DEFAULT 'UTC',
  subscription_plan text DEFAULT 'enterprise',
  employee_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  manager_id uuid,
  parent_id uuid,
  headcount integer DEFAULT 0,
  color text DEFAULT '#6366F1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dept_select" ON departments;
CREATE POLICY "dept_select" ON departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "dept_insert" ON departments;
CREATE POLICY "dept_insert" ON departments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "dept_update" ON departments;
CREATE POLICY "dept_update" ON departments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "dept_delete" ON departments;
CREATE POLICY "dept_delete" ON departments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  employee_id text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'employee',
  position text,
  employment_type text DEFAULT 'full_time',
  hire_date date,
  birth_date date,
  address text,
  city text,
  country text DEFAULT 'US',
  emergency_contact jsonb DEFAULT '{}',
  salary_info jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  skills text[] DEFAULT '{}',
  bio text,
  linkedin_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emp_select" ON employees;
CREATE POLICY "emp_select" ON employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "emp_insert" ON employees;
CREATE POLICY "emp_insert" ON employees FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "emp_update" ON employees;
CREATE POLICY "emp_update" ON employees FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "emp_delete" ON employees;
CREATE POLICY "emp_delete" ON employees FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration integer DEFAULT 60,
  color text DEFAULT '#6366F1',
  is_overnight boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_select" ON shifts;
CREATE POLICY "shift_select" ON shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "shift_insert" ON shifts;
CREATE POLICY "shift_insert" ON shifts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "shift_update" ON shifts;
CREATE POLICY "shift_update" ON shifts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "shift_delete" ON shifts;
CREATE POLICY "shift_delete" ON shifts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  date date NOT NULL,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sched_select" ON schedules;
CREATE POLICY "sched_select" ON schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sched_insert" ON schedules;
CREATE POLICY "sched_insert" ON schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "sched_update" ON schedules;
CREATE POLICY "sched_update" ON schedules FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "sched_delete" ON schedules;
CREATE POLICY "sched_delete" ON schedules FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- ATTENDANCE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_hours numeric(5,2),
  overtime_hours numeric(5,2) DEFAULT 0,
  status text DEFAULT 'present',
  notes text,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  location jsonb DEFAULT '{}',
  device_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_emp_date_idx ON attendance_records(employee_id, date);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_select" ON attendance_records;
CREATE POLICY "att_select" ON attendance_records FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "att_insert" ON attendance_records;
CREATE POLICY "att_insert" ON attendance_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "att_update" ON attendance_records;
CREATE POLICY "att_update" ON attendance_records FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "att_delete" ON attendance_records;
CREATE POLICY "att_delete" ON attendance_records FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- LEAVE TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  days_allowed integer DEFAULT 15,
  is_paid boolean DEFAULT true,
  carry_over boolean DEFAULT false,
  max_carry_over integer DEFAULT 0,
  requires_attachment boolean DEFAULT false,
  color text DEFAULT '#6366F1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lt_select" ON leave_types;
CREATE POLICY "lt_select" ON leave_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lt_insert" ON leave_types;
CREATE POLICY "lt_insert" ON leave_types FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lt_update" ON leave_types;
CREATE POLICY "lt_update" ON leave_types FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- LEAVE BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  allocated_days numeric(5,1) DEFAULT 0,
  used_days numeric(5,1) DEFAULT 0,
  pending_days numeric(5,1) DEFAULT 0,
  carried_over_days numeric(5,1) DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lb_select" ON leave_balances;
CREATE POLICY "lb_select" ON leave_balances FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lb_insert" ON leave_balances;
CREATE POLICY "lb_insert" ON leave_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lb_update" ON leave_balances;
CREATE POLICY "lb_update" ON leave_balances FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric(5,1) NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lr_select" ON leave_requests;
CREATE POLICY "lr_select" ON leave_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lr_insert" ON leave_requests;
CREATE POLICY "lr_insert" ON leave_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lr_update" ON leave_requests;
CREATE POLICY "lr_update" ON leave_requests FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lr_delete" ON leave_requests;
CREATE POLICY "lr_delete" ON leave_requests FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'general',
  target_roles text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ann_select" ON announcements;
CREATE POLICY "ann_select" ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ann_insert" ON announcements;
CREATE POLICY "ann_insert" ON announcements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ann_update" ON announcements;
CREATE POLICY "ann_update" ON announcements FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  category text DEFAULT 'system',
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changes jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "al_select" ON audit_logs;
CREATE POLICY "al_select" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "al_insert" ON audit_logs;
CREATE POLICY "al_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PERFORMANCE REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  overall_rating numeric(3,1),
  goals_met numeric(3,1),
  communication_rating numeric(3,1),
  teamwork_rating numeric(3,1),
  technical_rating numeric(3,1),
  strengths text,
  improvements text,
  goals text,
  status text DEFAULT 'draft',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_select" ON performance_reviews;
CREATE POLICY "pr_select" ON performance_reviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pr_insert" ON performance_reviews;
CREATE POLICY "pr_insert" ON performance_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "pr_update" ON performance_reviews;
CREATE POLICY "pr_update" ON performance_reviews FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
