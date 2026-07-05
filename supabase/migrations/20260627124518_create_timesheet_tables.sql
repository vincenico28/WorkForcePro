/*
# Timesheet Tables

Tracks employee work hours with weekly periods and entries.
Supports clock-in/clock-out derived entries and manual entries.
*/

-- Timesheet entries: Individual work time records
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60,
  total_hours NUMERIC(5,2) GENERATED ALWAYS AS (
    ROUND((EXTRACT(EPOCH FROM (end_time::interval - start_time::interval)) / 3600.0 - break_minutes / 60.0)::numeric, 2)
  ) STORED,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'clock_in', 'imported')),
  attendance_id UUID REFERENCES attendance_records(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date, start_time)
);

-- Enable RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "select_timesheet_org" ON timesheet_entries FOR SELECT
  TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE id = auth.uid()))
  );

CREATE POLICY "insert_timesheet_own" ON timesheet_entries FOR INSERT
  TO authenticated WITH CHECK (employee_id = auth.uid() OR employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())));

CREATE POLICY "update_timesheet_org" ON timesheet_entries FOR UPDATE
  TO authenticated USING (employee_id IN (SELECT id FROM employees WHERE org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())));

CREATE POLICY "delete_timesheet_own" ON timesheet_entries FOR DELETE
  TO authenticated USING (employee_id = auth.uid());

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_employee_date ON timesheet_entries(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON timesheet_entries(date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_timesheet_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timesheet_entries_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION update_timesheet_entries_updated_at();

-- Weekly timesheet periods (for locking/approval)
CREATE TABLE IF NOT EXISTS timesheet_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'submitted', 'approved', 'locked')),
  submitted_by UUID REFERENCES employees(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, start_date)
);

ALTER TABLE timesheet_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_periods_org" ON timesheet_periods FOR SELECT
  TO authenticated USING (org_id IN (SELECT org_id FROM employees WHERE id = auth.uid()));

CREATE POLICY "insert_periods_org" ON timesheet_periods FOR INSERT
  TO authenticated WITH CHECK (org_id IN (SELECT org_id FROM employees WHERE id = auth.uid()));

CREATE POLICY "update_periods_org" ON timesheet_periods FOR UPDATE
  TO authenticated USING (org_id IN (SELECT org_id FROM employees WHERE id = auth.uid()));

COMMENT ON TABLE timesheet_entries IS 'Individual timesheet entries tracking work hours';
COMMENT ON TABLE timesheet_periods IS 'Weekly timesheet periods for approval workflow';
