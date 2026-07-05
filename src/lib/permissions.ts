import type { EmployeeRole } from '@/types'

export type Permission =
  | 'dashboard:view'
  | 'employees:view'
  | 'employees:create'
  | 'employees:edit'
  | 'employees:delete'
  | 'departments:view'
  | 'departments:manage'
  | 'attendance:view'
  | 'attendance:manage'
  | 'timesheet:view'
  | 'timesheet:approve'
  | 'timesheet:edit'
  | 'leaves:view'
  | 'leaves:approve'
  | 'leaves:manage'
  | 'schedule:view'
  | 'schedule:manage'
  | 'payroll:view'
  | 'payroll:manage'
  | 'performance:view'
  | 'performance:manage'
  | 'analytics:view'
  | 'announcements:view'
  | 'announcements:create'
  | 'notifications:view'
  | 'notifications:manage'
  | 'settings:view'
  | 'settings:manage'

export type RoleConfig = {
  label: string
  description: string
  permissions: Permission[]
}

export const ROLE_CONFIG: Record<EmployeeRole, RoleConfig> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full system access across all organizations',
    permissions: [
      'dashboard:view', 'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
      'departments:view', 'departments:manage', 'attendance:view', 'attendance:manage',
      'timesheet:view', 'timesheet:approve', 'timesheet:edit', 'leaves:view', 'leaves:approve', 'leaves:manage',
      'schedule:view', 'schedule:manage', 'payroll:view', 'payroll:manage', 'performance:view', 'performance:manage',
      'analytics:view', 'announcements:view', 'announcements:create', 'notifications:view', 'notifications:manage',
      'settings:view', 'settings:manage',
    ],
  },
  admin: {
    label: 'Admin',
    description: 'Full access within the organization',
    permissions: [
      'dashboard:view', 'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
      'departments:view', 'departments:manage', 'attendance:view', 'attendance:manage',
      'timesheet:view', 'timesheet:approve', 'timesheet:edit', 'leaves:view', 'leaves:approve', 'leaves:manage',
      'schedule:view', 'schedule:manage', 'payroll:view', 'payroll:manage', 'performance:view', 'performance:manage',
      'analytics:view', 'announcements:view', 'announcements:create', 'notifications:view', 'notifications:manage',
      'settings:view', 'settings:manage',
    ],
  },
  hr_manager: {
    label: 'HR Manager',
    description: 'HR operations and employee management',
    permissions: [
      'dashboard:view', 'employees:view', 'employees:create', 'employees:edit',
      'departments:view', 'attendance:view', 'attendance:manage',
      'timesheet:view', 'timesheet:approve', 'timesheet:edit', 'leaves:view', 'leaves:approve', 'leaves:manage',
      'schedule:view', 'schedule:manage', 'payroll:view', 'performance:view', 'performance:manage',
      'analytics:view', 'announcements:view', 'announcements:create', 'notifications:view',
      'settings:view',
    ],
  },
  team_supervisor: {
    label: 'Team Supervisor',
    description: 'Team oversight and approvals',
    permissions: [
      'dashboard:view', 'employees:view',
      'attendance:view', 'timesheet:view', 'timesheet:approve', 'leaves:view', 'leaves:approve',
      'schedule:view', 'performance:view', 'announcements:view', 'notifications:view',
    ],
  },
  employee: {
    label: 'Employee',
    description: 'Basic self-service access',
    permissions: [
      'dashboard:view', 'attendance:view', 'timesheet:view', 'leaves:view',
      'schedule:view', 'performance:view', 'announcements:view', 'notifications:view',
    ],
  },
}

export function getPermissions(role: EmployeeRole | undefined): Permission[] {
  if (!role) return []
  return ROLE_CONFIG[role]?.permissions ?? []
}

export function hasPermission(role: EmployeeRole | undefined, permission: Permission): boolean {
  return getPermissions(role).includes(permission)
}

export function hasAnyPermission(role: EmployeeRole | undefined, permissions: Permission[]): boolean {
  const rolePerms = getPermissions(role)
  return permissions.some(p => rolePerms.includes(p))
}

export function hasAllPermissions(role: EmployeeRole | undefined, permissions: Permission[]): boolean {
  const rolePerms = getPermissions(role)
  return permissions.every(p => rolePerms.includes(p))
}

export const PERMISSION_GROUPS = {
  employees: ['employees:view', 'employees:create', 'employees:edit', 'employees:delete'] as Permission[],
  departments: ['departments:view', 'departments:manage'] as Permission[],
  attendance: ['attendance:view', 'attendance:manage'] as Permission[],
  timesheet: ['timesheet:view', 'timesheet:approve', 'timesheet:edit'] as Permission[],
  leaves: ['leaves:view', 'leaves:approve', 'leaves:manage'] as Permission[],
  schedule: ['schedule:view', 'schedule:manage'] as Permission[],
  payroll: ['payroll:view', 'payroll:manage'] as Permission[],
  performance: ['performance:view', 'performance:manage'] as Permission[],
  analytics: ['analytics:view'] as Permission[],
  announcements: ['announcements:view', 'announcements:create'] as Permission[],
  settings: ['settings:view', 'settings:manage'] as Permission[],
}
