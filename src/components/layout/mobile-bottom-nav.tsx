import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Clock, Calendar, DollarSign, Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { useLeaveRequests } from '@/hooks/use-leaves'

export function MobileBottomNav() {
  const location = useLocation()
  const { toggleSidebar, openMobile } = useSidebar()
  const { can } = usePermissions()
  const { data: pendingLeaves } = useLeaveRequests('pending')
  const pendingLeavesCount = pendingLeaves?.length ?? 0

  const navItems = [
    {
      title: 'Dashboard',
      url: '/app/dashboard',
      icon: LayoutDashboard,
      active: location.pathname === '/app/dashboard',
    },
    {
      title: 'Clock In/Out',
      url: '/app/attendance',
      icon: Clock,
      active: location.pathname.startsWith('/app/attendance'),
    },
    {
      title: 'Leaves',
      url: '/app/leaves',
      icon: Calendar,
      active: location.pathname.startsWith('/app/leaves'),
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
    },
    {
      title: can.viewPayroll() ? 'Payroll' : 'Schedule',
      url: can.viewPayroll() ? '/app/payroll' : '/app/schedule',
      icon: DollarSign,
      active: location.pathname.startsWith('/app/payroll') || location.pathname.startsWith('/app/schedule'),
    },
  ]

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/70 safe-area-bottom shadow-lg transition-transform duration-300"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors relative active:scale-95 ${
                item.active 
                  ? 'text-primary font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div className={`p-1 rounded-xl transition-all ${item.active ? 'bg-primary/15 text-primary scale-110' : ''}`}>
                  <Icon className="size-5 shrink-0" />
                </div>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight truncate max-w-[68px]">{item.title}</span>
              {item.active && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}

        {/* More / Menu Drawer trigger */}
        <button
          onClick={toggleSidebar}
          aria-label="Open Sidebar Navigation Menu"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors active:scale-95 ${
            openMobile ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${openMobile ? 'bg-primary/15 text-primary' : ''}`}>
            <Menu className="size-5 shrink-0" />
          </div>
          <span className="mt-0.5 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  )
}
