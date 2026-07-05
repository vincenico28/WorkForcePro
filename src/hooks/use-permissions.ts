import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  type Permission,
} from '@/lib/permissions'

export function usePermissions() {
  const employee = useAuthStore((s) => s.employee)
  const role = employee?.role

  const permissions = useMemo(() => getPermissions(role), [role])

  const can = {
    permission: (p: Permission) => hasPermission(role, p),
    any: (ps: Permission[]) => hasAnyPermission(role, ps),
    all: (ps: Permission[]) => hasAllPermissions(role, ps),
    viewDashboard: () => hasPermission(role, 'dashboard:view'),
    viewEmployees: () => hasPermission(role, 'employees:view'),
    manageEmployees: () => hasAnyPermission(role, ['employees:create', 'employees:edit', 'employees:delete']),
    viewDepartments: () => hasPermission(role, 'departments:view'),
    manageDepartments: () => hasPermission(role, 'departments:manage'),
    viewAttendance: () => hasPermission(role, 'attendance:view'),
    manageAttendance: () => hasPermission(role, 'attendance:manage'),
    viewTimesheet: () => hasPermission(role, 'timesheet:view'),
    approveTimesheet: () => hasPermission(role, 'timesheet:approve'),
    editTimesheet: () => hasPermission(role, 'timesheet:edit'),
    viewLeaves: () => hasPermission(role, 'leaves:view'),
    approveLeaves: () => hasPermission(role, 'leaves:approve'),
    manageLeaves: () => hasPermission(role, 'leaves:manage'),
    viewSchedule: () => hasPermission(role, 'schedule:view'),
    manageSchedule: () => hasPermission(role, 'schedule:manage'),
    viewPayroll: () => hasPermission(role, 'payroll:view'),
    managePayroll: () => hasPermission(role, 'payroll:manage'),
    viewPerformance: () => hasPermission(role, 'performance:view'),
    managePerformance: () => hasPermission(role, 'performance:manage'),
    viewAnalytics: () => hasPermission(role, 'analytics:view'),
    viewAnnouncements: () => hasPermission(role, 'announcements:view'),
    createAnnouncements: () => hasPermission(role, 'announcements:create'),
    viewSettings: () => hasPermission(role, 'settings:view'),
    manageSettings: () => hasPermission(role, 'settings:manage'),
    isAdmin: () => ['super_admin', 'admin'].includes(role ?? ''),
    isHR: () => ['super_admin', 'admin', 'hr_manager'].includes(role ?? ''),
    isSupervisor: () => ['super_admin', 'admin', 'hr_manager', 'team_supervisor'].includes(role ?? ''),
  }

  return {
    role,
    permissions,
    can,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}

export function useAuthGuard(permission: Permission | Permission[]) {
  const { can, role } = usePermissions()

  const hasAccess = useMemo(() => {
    if (!role) return false
    if (Array.isArray(permission)) {
      return can.any(permission)
    }
    return can.permission(permission)
  }, [role, permission, can])

  return hasAccess
}
