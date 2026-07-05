import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import type { Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ArrowLeft } from 'lucide-react'

interface PermissionGuardProps {
  permission?: Permission | Permission[]
  permissions?: Permission[]
  requireAll?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback,
}: PermissionGuardProps) {
  const { can, role } = usePermissions()

  const perms = permission
    ? Array.isArray(permission) ? permission : [permission]
    : permissions ?? []

  const hasAccess = role
    ? requireAll
      ? can.all(perms)
      : perms.length === 0
        ? true
        : perms.length === 1
          ? can.permission(perms[0])
          : can.any(perms)
    : false

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Lock className="size-7 text-muted-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-lg font-semibold">Access Denied</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              You don't have permission to access this page. Contact your administrator if you believe this is an error.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 size-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

interface RoleGuardProps {
  roles: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { role } = usePermissions()
  const allowed = Array.isArray(roles) ? roles : [roles]

  if (!role || !allowed.includes(role)) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Lock className="size-7 text-muted-foreground" />
              </div>
            </div>
            <h2 className="mb-2 text-lg font-semibold">Access Denied</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              This area is restricted to {allowed.join(', ')} roles only.
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 size-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Permission-based Access Control map for routes
export const PAGE_PERMISSIONS: Record<string, Permission | undefined> = {
  '/app/dashboard': 'dashboard:view',
  '/app/employees': 'employees:view',
  '/app/employees/:id': 'employees:view',
  '/app/departments': 'departments:view',
  '/app/attendance': 'attendance:view',
  '/app/timesheet': 'timesheet:view',
  '/app/leaves': 'leaves:view',
  '/app/schedule': 'schedule:view',
  '/app/payroll': 'payroll:view',
  '/app/performance': 'performance:view',
  '/app/analytics': 'analytics:view',
  '/app/announcements': 'announcements:view',
  '/app/notifications': 'notifications:view',
  '/app/settings': 'settings:view',
}
