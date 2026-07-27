-- Allow super admins to bypass org checks for timesheet entries
CREATE POLICY "super_admin_timesheet_select" ON timesheet_entries FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "super_admin_timesheet_insert" ON timesheet_entries FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "super_admin_timesheet_update" ON timesheet_entries FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "super_admin_timesheet_delete" ON timesheet_entries FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid() AND role = 'super_admin')
);
