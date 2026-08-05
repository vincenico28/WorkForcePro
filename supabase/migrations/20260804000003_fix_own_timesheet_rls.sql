-- Ensure that every user can absolutely see their own timesheet entries
-- This bypasses any complex ORG-level queries that might fail for standard employees.

DROP POLICY IF EXISTS "select_timesheet_own" ON timesheet_entries;
CREATE POLICY "select_timesheet_own" ON timesheet_entries FOR SELECT TO authenticated USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);
