-- Fix broken Timesheet policies that used employee.id directly instead of comparing with employee.user_id

-- 1. Drop existing policies on timesheet_entries
DROP POLICY IF EXISTS "select_timesheet_org" ON timesheet_entries;
DROP POLICY IF EXISTS "insert_timesheet_own" ON timesheet_entries;
DROP POLICY IF EXISTS "update_timesheet_org" ON timesheet_entries;
DROP POLICY IF EXISTS "delete_timesheet_own" ON timesheet_entries;

-- Recreate policies on timesheet_entries with correct user_id check
CREATE POLICY "select_timesheet_org" ON timesheet_entries FOR SELECT
  TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid()))
  );

CREATE POLICY "insert_timesheet_own" ON timesheet_entries FOR INSERT
  TO authenticated WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) OR 
    employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid()))
  );

CREATE POLICY "update_timesheet_org" ON timesheet_entries FOR UPDATE
  TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid()))
  );

CREATE POLICY "delete_timesheet_own" ON timesheet_entries FOR DELETE
  TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- 2. Drop existing policies on timesheet_periods
DROP POLICY IF EXISTS "select_periods_org" ON timesheet_periods;
DROP POLICY IF EXISTS "insert_periods_org" ON timesheet_periods;
DROP POLICY IF EXISTS "update_periods_org" ON timesheet_periods;

-- Recreate policies on timesheet_periods with correct user_id check
CREATE POLICY "select_periods_org" ON timesheet_periods FOR SELECT
  TO authenticated USING (
    org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_periods_org" ON timesheet_periods FOR INSERT
  TO authenticated WITH CHECK (
    org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "update_periods_org" ON timesheet_periods FOR UPDATE
  TO authenticated USING (
    org_id IN (SELECT org_id FROM employees WHERE user_id = auth.uid())
  );
