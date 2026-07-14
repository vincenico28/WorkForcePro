import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, Brain, ArrowRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-misc'
import { AIAssistantPanel } from '@/components/shared/ai-assistant'
import { CommandPalette } from '@/components/shared/command-palette'

const ROUTE_LABELS: Record<string, string[]> = {
  '/app/dashboard': ['App', 'Dashboard'],
  '/app/employees': ['HR', 'Employees'],
  '/app/departments': ['HR', 'Departments'],
  '/app/attendance': ['HR', 'Attendance'],
  '/app/timesheet': ['HR', 'Timesheet'],
  '/app/leaves': ['HR', 'Leave Management'],
  '/app/schedule': ['HR', 'Schedule'],
  '/app/payroll': ['HR', 'Payroll'],
  '/app/performance': ['HR', 'Performance'],
  '/app/analytics': ['Reports', 'Analytics'],
  '/app/announcements': ['Comms', 'Announcements'],
  '/app/notifications': ['Comms', 'Notifications'],
  '/app/settings': ['System', 'Settings'],
}

const TYPE_DOTS: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
}

export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { employee } = useAuthStore()
  const breadcrumb = ROUTE_LABELS[location.pathname] ?? ['App', 'Page']
  const [cmdOpen, setCmdOpen] = useState(false)

  const { data: notifications, isLoading: notifLoading } = useNotifications(employee?.id ?? '')
  const { mutateAsync: markAllRead } = useMarkNotificationsRead()

  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length
  const recentNotifs = (notifications ?? []).slice(0, 8)

  const handleMarkAllRead = async () => {
    if (employee?.id) await markAllRead(employee.id)
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/app/dashboard" className="text-xs">
              {breadcrumb[0]}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-medium">{breadcrumb[1]}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      <div className="ml-auto flex items-center gap-1.5">
        {/* Search */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-2 text-muted-foreground md:flex"
          onClick={() => setCmdOpen(true)}
        >
          <Search className="size-4" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>

        {/* AI Assistant */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
              <Brain className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-[420px] p-0">
            <AIAssistantPanel />
          </SheetContent>
        </Sheet>

        {/* Notifications */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex size-2 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-[380px]">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Notifications</SheetTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <>
                      <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
                        Mark all read
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
              {notifLoading ? (
                <div className="space-y-2 px-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 rounded-lg p-3">
                      <Skeleton className="mt-0.5 size-2 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="mb-3 size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-0.5 px-1">
                  {recentNotifs.map(n => (
                    <div
                      key={n.id}
                      className={`flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`mt-1.5 size-1.5 shrink-0 rounded-full ${!n.is_read ? (TYPE_DOTS[n.type] ?? 'bg-primary') : 'bg-transparent'}`} />
                      <div className="flex-1 space-y-0.5">
                        <p className={`text-sm font-medium leading-snug ${n.is_read ? 'text-muted-foreground' : ''}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {(notifications?.length ?? 0) > 0 && (
              <div className="border-t border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground"
                  onClick={() => navigate('/app/notifications')}
                >
                  View all notifications
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <ModeToggle />

        <Sheet>
          <SheetTrigger asChild>
            <Avatar className="size-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {`${employee?.first_name?.[0] ?? ''}${employee?.last_name?.[0] ?? ''}`.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-sm overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>My Profile</SheetTitle>
            </SheetHeader>
            {employee ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="size-24">
                    <AvatarFallback className="bg-primary text-3xl text-primary-foreground">
                      {`${employee.first_name?.[0] ?? ''}${employee.last_name?.[0] ?? ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{employee.first_name} {employee.last_name}</h3>
                    <p className="text-sm text-muted-foreground">{employee.position || 'Employee'}</p>
                    <Badge variant="secondary" className="mt-2 capitalize">{employee.status}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Information</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Employee ID</span>
                        <span className="font-medium">{employee.employee_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Department</span>
                        <span className="font-medium">{employee.departments?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-medium capitalize">{employee.role.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Employment</span>
                        <span className="font-medium capitalize">{employee.employment_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Date Hired</span>
                        <span className="font-medium">{employee.hire_date ? format(new Date(employee.hire_date), 'MMM d, yyyy') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{employee.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{employee.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                No profile information available.
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
