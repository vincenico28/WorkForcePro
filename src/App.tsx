import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import LandingPage from '@/pages/landing'
import LoginPage from '@/pages/auth/login'
import ForgotPasswordPage from '@/pages/auth/forgot-password'
import AppLayout from '@/pages/app/layout'
import DashboardPage from '@/pages/app/dashboard'
import EmployeesPage from '@/pages/app/employees'
import EmployeeDetailPage from '@/pages/app/employees/detail'
import AttendancePage from '@/pages/app/attendance'
import LeavesPage from '@/pages/app/leaves'
import SchedulePage from '@/pages/app/schedule'
import AnalyticsPage from '@/pages/app/analytics'
import DepartmentsPage from '@/pages/app/departments'
import AnnouncementsPage from '@/pages/app/announcements'
import NotificationsPage from '@/pages/app/notifications'
import PayrollPage from '@/pages/app/payroll'
import PerformancePage from '@/pages/app/performance'
import TimesheetPage from '@/pages/app/timesheet'
import SettingsPage from '@/pages/app/settings'
import SystemUsersPage from '@/pages/app/users'
import { Spinner } from '@/components/ui/spinner'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Spinner className="size-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading WorkForce Pro...</p>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        initialize() // this will cleanly clear the store
      }
    })

    return () => subscription.unsubscribe()
  }, [initialize])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<PermissionGuard permission="dashboard:view"><DashboardPage /></PermissionGuard>} />
        <Route path="employees" element={<PermissionGuard permission="employees:view"><EmployeesPage /></PermissionGuard>} />
        <Route path="employees/:id" element={<PermissionGuard permission="employees:view"><EmployeeDetailPage /></PermissionGuard>} />
        <Route path="attendance" element={<PermissionGuard permission="attendance:view"><AttendancePage /></PermissionGuard>} />
        <Route path="timesheet" element={<PermissionGuard permission="timesheet:view"><TimesheetPage /></PermissionGuard>} />
        <Route path="leaves" element={<PermissionGuard permission="leaves:view"><LeavesPage /></PermissionGuard>} />
        <Route path="schedule" element={<PermissionGuard permission="schedule:view"><SchedulePage /></PermissionGuard>} />
        <Route path="analytics" element={<PermissionGuard permission="analytics:view"><AnalyticsPage /></PermissionGuard>} />
        <Route path="departments" element={<PermissionGuard permission="departments:view"><DepartmentsPage /></PermissionGuard>} />
        <Route path="announcements" element={<PermissionGuard permission="announcements:view"><AnnouncementsPage /></PermissionGuard>} />
        <Route path="notifications" element={<PermissionGuard permission="notifications:view"><NotificationsPage /></PermissionGuard>} />
        <Route path="payroll" element={<PermissionGuard permission="payroll:view"><PayrollPage /></PermissionGuard>} />
        <Route path="performance" element={<PermissionGuard permission="performance:view"><PerformancePage /></PermissionGuard>} />
        <Route path="settings" element={<PermissionGuard permission="settings:view"><SettingsPage /></PermissionGuard>} />
        <Route path="users" element={<PermissionGuard permission="settings:view"><SystemUsersPage /></PermissionGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
