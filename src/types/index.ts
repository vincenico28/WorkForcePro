export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  timezone: string
  subscription_plan: string
  employee_count: number
  created_at: string
}

export interface Department {
  id: string
  org_id: string
  name: string
  code?: string
  description?: string
  manager_id?: string
  parent_id?: string
  headcount: number
  color: string
  created_at: string
}

export type EmployeeRole = 'super_admin' | 'admin' | 'hr_manager' | 'team_supervisor' | 'employee'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern'

export interface Employee {
  id: string
  user_id?: string
  org_id: string
  department_id?: string | null
  employee_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string
  role: EmployeeRole
  position?: string
  employment_type: EmploymentType
  hire_date?: string
  birth_date?: string
  address?: string
  city?: string
  country?: string
  emergency_contact?: Record<string, unknown>
  salary_info?: Record<string, unknown>
  status: EmployeeStatus
  manager_id?: string
  skills?: string[]
  bio?: string
  linkedin_url?: string
  created_at: string
  updated_at: string
  departments?: Department
  manager?: Employee
}

export interface Shift {
  id: string
  org_id: string
  name: string
  start_time: string
  end_time: string
  break_duration: number
  color: string
  is_overnight: boolean
  is_active: boolean
}

export interface Schedule {
  id: string
  employee_id: string
  shift_id?: string
  date: string
  status: 'scheduled' | 'confirmed' | 'swapped' | 'cancelled'
  notes?: string
  employees?: Employee
  shifts?: Shift
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'holiday'

export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  clock_in?: string
  clock_out?: string
  break_start?: string
  break_end?: string
  total_hours?: number
  overtime_hours?: number
  status: AttendanceStatus
  notes?: string
  approved_by?: string
  approved_at?: string
  location?: Record<string, unknown>
  created_at: string
  employees?: Employee
}

export interface LeaveType {
  id: string
  org_id: string
  name: string
  code: string
  days_allowed: number
  is_paid: boolean
  carry_over: boolean
  max_carry_over: number
  requires_attachment: boolean
  color: string
  is_active: boolean
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type_id: string
  year: number
  allocated_days: number
  used_days: number
  pending_days: number
  carried_over_days: number
  leave_types?: LeaveType
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: LeaveStatus
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  attachment_url?: string
  created_at: string
  updated_at: string
  employees?: Employee
  leave_types?: LeaveType
  reviewer?: Employee
}

export interface Announcement {
  id: string
  org_id: string
  author_id: string
  title: string
  content: string
  type: 'general' | 'urgent' | 'event' | 'policy'
  target_roles: string[]
  is_pinned: boolean
  published_at?: string
  expires_at?: string
  views: number
  created_at: string
  employees?: Employee
}

export interface Notification {
  id: string
  employee_id: string
  title: string
  message?: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'attendance' | 'leave' | 'schedule' | 'system' | 'announcement'
  is_read: boolean
  action_url?: string
  created_at: string
}

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id: string
  review_period_start: string
  review_period_end: string
  overall_rating?: number
  goals_met?: number
  communication_rating?: number
  teamwork_rating?: number
  technical_rating?: number
  strengths?: string
  improvements?: string
  goals?: string
  status: 'draft' | 'submitted' | 'acknowledged'
  submitted_at?: string
  created_at: string
  employees?: Employee
  reviewer?: Employee
}

export interface AuthUser {
  id: string
  email: string
  employee?: Employee
}

export interface DashboardStats {
  totalEmployees: number
  presentToday: number
  onLeave: number
  lateToday: number
  absentToday: number
  pendingLeaves: number
  openPositions: number
  newHires: number
}

export interface TimesheetEntry {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  total_hours: number
  overtime_hours: number
  is_approved: boolean
  approved_by?: string
  approved_at?: string
  notes?: string
  source: 'manual' | 'clock_in' | 'imported'
  attendance_id?: string
  created_at: string
  updated_at: string
  employees?: Employee
}

export interface TimesheetPeriod {
  id: string
  org_id: string
  start_date: string
  end_date: string
  status: 'draft' | 'open' | 'submitted' | 'approved' | 'locked'
  submitted_by?: string
  submitted_at?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}
