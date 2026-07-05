import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, Calendar, BarChart3, Building2,
  Settings, LogOut, Bell, Megaphone, ChevronDown, Briefcase,
  DollarSign, Star, Timer,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useLeaveRequests } from '@/hooks/use-leaves'
import { usePermissions } from '@/hooks/use-permissions'
import type { Permission } from '@/lib/permissions'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  permission?: Permission
}

const NAV_MAIN: NavItem[] = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { title: 'Employees', url: '/app/employees', icon: Users, permission: 'employees:view' },
  { title: 'Departments', url: '/app/departments', icon: Building2, permission: 'departments:view' },
]

const NAV_HR: NavItem[] = [
  { title: 'Attendance', url: '/app/attendance', icon: Clock, permission: 'attendance:view' },
  { title: 'Timesheet', url: '/app/timesheet', icon: Timer, permission: 'timesheet:view' },
  { title: 'Leave Management', url: '/app/leaves', icon: Briefcase, permission: 'leaves:view' },
  { title: 'Schedule', url: '/app/schedule', icon: Calendar, permission: 'schedule:view' },
  { title: 'Payroll', url: '/app/payroll', icon: DollarSign, permission: 'payroll:view' },
  { title: 'Performance', url: '/app/performance', icon: Star, permission: 'performance:view' },
]

const NAV_REPORTS: NavItem[] = [
  { title: 'Analytics', url: '/app/analytics', icon: BarChart3, permission: 'analytics:view' },
  { title: 'Announcements', url: '/app/announcements', icon: Megaphone, permission: 'announcements:view' },
  { title: 'Notifications', url: '/app/notifications', icon: Bell, permission: 'notifications:view' },
]

const NAV_SYSTEM: NavItem[] = [
  { title: 'Settings', url: '/app/settings', icon: Settings, permission: 'settings:view' },
]

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U'
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    hr_manager: 'HR Manager',
    team_supervisor: 'Team Supervisor',
    employee: 'Employee',
  }
  return labels[role] ?? role
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { employee, signOut } = useAuthStore()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  const { data: pendingLeaves } = useLeaveRequests('pending')
  const pendingCount = pendingLeaves?.length ?? 0
  const { can } = usePermissions()

  const isActive = (url: string) => location.pathname === url

  // Filter navigation items based on permissions
  const filterNav = (items: NavItem[]) => items.filter(item => !item.permission || can.permission(item.permission))
  const mainNav = useMemo(() => filterNav(NAV_MAIN), [can])
  const hrNav = useMemo(() => filterNav(NAV_HR), [can])
  const reportsNav = useMemo(() => filterNav(NAV_REPORTS), [can])
  const systemNav = useMemo(() => filterNav(NAV_SYSTEM), [can])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent">
              <Link to="/app/dashboard">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
                  <Building2 className="size-4 text-sidebar-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-semibold text-sidebar-foreground">WorkForce Pro</span>
                  <span className="truncate text-xs text-sidebar-foreground/50">Nexus Technologies</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {mainNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40">Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hrNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40">HR Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hrNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon />
                          <span>{item.title}</span>
                        </div>
                        {item.title === 'Leave Management' && pendingCount > 0 && !collapsed && (
                          <Badge className="ml-auto h-5 min-w-5 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                            {pendingCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {reportsNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40">Reports & Comms</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {reportsNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {systemNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40">System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent" tooltip="Account">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {getInitials(employee?.first_name, employee?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate text-sm font-medium text-sidebar-foreground">
                      {employee ? `${employee.first_name} ${employee.last_name}` : 'User'}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/50">
                      {employee ? getRoleLabel(employee.role) : 'Loading...'}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-sidebar-foreground/40" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{employee?.first_name} {employee?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{employee?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/settings">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
