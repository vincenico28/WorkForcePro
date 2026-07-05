-- ============================================================
-- Fix 1: Mutable search_path on trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_timesheet_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Fix 2: organizations — scope to authenticated user's own org
-- An authenticated user can only insert/update the org they belong to.
-- Super admins manage their org; new orgs can be created only by the
-- user who will own them (checked via absence of existing membership).
-- ============================================================
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;

-- INSERT: only allowed if no employee record exists yet for this user
-- (i.e. registering a brand-new org). After setup, org management is
-- done through admin UI which goes through service-role or the update policy.
CREATE POLICY "org_insert" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM employees WHERE user_id = auth.uid()
    )
  );

-- UPDATE: only admins of that org can update it
CREATE POLICY "org_update" ON organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- Fix 3: departments — scope to same org, write restricted to admins/HR
-- ============================================================
DROP POLICY IF EXISTS "dept_insert" ON departments;
DROP POLICY IF EXISTS "dept_update" ON departments;
DROP POLICY IF EXISTS "dept_delete" ON departments;

CREATE POLICY "dept_insert" ON departments
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "dept_update" ON departments
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "dept_delete" ON departments
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- Fix 4: employees — write restricted by role
-- ============================================================
DROP POLICY IF EXISTS "emp_insert" ON employees;
DROP POLICY IF EXISTS "emp_update" ON employees;
DROP POLICY IF EXISTS "emp_delete" ON employees;

-- INSERT: admins/HR can add employees to their own org; or self-registration
CREATE POLICY "emp_insert" ON employees
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Self-registration (no existing employee record yet)
    NOT EXISTS (SELECT 1 FROM employees WHERE user_id = auth.uid())
    OR
    -- Admin/HR adding to their own org
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- UPDATE: admins/HR can update anyone in org; employees can update own record
CREATE POLICY "emp_update" ON employees
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- DELETE: only super_admin/admin
CREATE POLICY "emp_delete" ON employees
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- Fix 5: shifts — admin/HR only for writes
-- ============================================================
DROP POLICY IF EXISTS "shift_insert" ON shifts;
DROP POLICY IF EXISTS "shift_update" ON shifts;
DROP POLICY IF EXISTS "shift_delete" ON shifts;

CREATE POLICY "shift_insert" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "shift_update" ON shifts
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "shift_delete" ON shifts
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- Fix 6: schedules — HR/supervisors write; employees read-own
-- ============================================================
DROP POLICY IF EXISTS "sched_insert" ON schedules;
DROP POLICY IF EXISTS "sched_update" ON schedules;
DROP POLICY IF EXISTS "sched_delete" ON schedules;

CREATE POLICY "sched_insert" ON schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  );

CREATE POLICY "sched_update" ON schedules
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  );

CREATE POLICY "sched_delete" ON schedules
  FOR DELETE TO authenticated
  USING (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  );

-- ============================================================
-- Fix 7: attendance_records — employees own records; admins manage all
-- ============================================================
DROP POLICY IF EXISTS "att_insert" ON attendance_records;
DROP POLICY IF EXISTS "att_update" ON attendance_records;
DROP POLICY IF EXISTS "att_delete" ON attendance_records;

CREATE POLICY "att_insert" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Own clock-in
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    -- Admins/HR clocking in for others in their org
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "att_update" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "att_delete" ON attendance_records
  FOR DELETE TO authenticated
  USING (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- ============================================================
-- Fix 8: leave_types — org admins/HR manage
-- ============================================================
DROP POLICY IF EXISTS "lt_insert" ON leave_types;
DROP POLICY IF EXISTS "lt_update" ON leave_types;

CREATE POLICY "lt_insert" ON leave_types
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

CREATE POLICY "lt_update" ON leave_types
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- Fix 9: leave_balances — HR/admins manage; employees read-own (via select)
-- ============================================================
DROP POLICY IF EXISTS "lb_insert" ON leave_balances;
DROP POLICY IF EXISTS "lb_update" ON leave_balances;

CREATE POLICY "lb_insert" ON leave_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "lb_update" ON leave_balances
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

-- ============================================================
-- Fix 10: leave_requests — employees own; supervisors/HR approve
-- ============================================================
DROP POLICY IF EXISTS "lr_insert" ON leave_requests;
DROP POLICY IF EXISTS "lr_update" ON leave_requests;
DROP POLICY IF EXISTS "lr_delete" ON leave_requests;

CREATE POLICY "lr_insert" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "lr_update" ON leave_requests
  FOR UPDATE TO authenticated
  USING (
    -- Own request (e.g. cancellation)
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    -- Supervisors/HR approving
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager', 'team_supervisor')
      )
    )
  );

CREATE POLICY "lr_delete" ON leave_requests
  FOR DELETE TO authenticated
  USING (
    -- Only own pending requests can be deleted (cancelled)
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- ============================================================
-- Fix 11: announcements — only authors/admins can write
-- ============================================================
DROP POLICY IF EXISTS "ann_insert" ON announcements;
DROP POLICY IF EXISTS "ann_update" ON announcements;

CREATE POLICY "ann_insert" ON announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_manager')
    )
    AND author_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "ann_update" ON announcements
  FOR UPDATE TO authenticated
  USING (
    author_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    author_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- Fix 12: notifications — employees manage own; system/admins insert
-- ============================================================
DROP POLICY IF EXISTS "notif_insert" ON notifications;
DROP POLICY IF EXISTS "notif_update" ON notifications;

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Own notification
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    -- Admins/HR creating notifications for org members
    employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE TO authenticated
  USING (
    -- Only own notifications (marking as read)
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ============================================================
-- Fix 13: audit_logs — users can only insert their own logs
-- ============================================================
DROP POLICY IF EXISTS "al_insert" ON audit_logs;

CREATE POLICY "al_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================
-- Fix 14: performance_reviews — reviewers and HR manage
-- ============================================================
DROP POLICY IF EXISTS "pr_insert" ON performance_reviews;
DROP POLICY IF EXISTS "pr_update" ON performance_reviews;

CREATE POLICY "pr_insert" ON performance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR reviewer_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );

CREATE POLICY "pr_update" ON performance_reviews
  FOR UPDATE TO authenticated
  USING (
    reviewer_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  )
  WITH CHECK (
    reviewer_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR employee_id IN (
      SELECT e2.id FROM employees e2
      WHERE e2.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'admin', 'hr_manager')
      )
    )
  );
