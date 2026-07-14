import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle,
  Calendar, Clock, Megaphone, Settings2, Filter, ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useNotifications, useMarkNotificationsRead, useMarkNotificationRead } from '@/hooks/use-misc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; className: string; dot: string }> = {
  info: {
    icon: Info,
    className: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  error: {
    icon: XCircle,
    className: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  attendance: { label: 'Attendance', icon: Clock },
  leave: { label: 'Leave', icon: Calendar },
  schedule: { label: 'Schedule', icon: Calendar },
  system: { label: 'System', icon: Settings2 },
  announcement: { label: 'Announcement', icon: Megaphone },
}

function NotificationItem({
  notif,
  employeeId,
}: {
  notif: any
  employeeId: string
}) {
  const navigate = useNavigate()
  const { mutate: markOne } = useMarkNotificationRead()
  const type = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info
  const category = CATEGORY_CONFIG[notif.category] ?? CATEGORY_CONFIG.system
  const Icon = type.icon
  const CategoryIcon = category.icon

  const handleClick = () => {
    if (!notif.is_read) {
      markOne({ id: notif.id, employeeId })
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          onClick={handleClick}
          className={cn(
            'group relative flex gap-4 rounded-xl border border-border p-4 transition-all hover:shadow-sm cursor-pointer',
            !notif.is_read && 'bg-primary/[0.02] border-primary/20',
            'hover:border-primary/30',
          )}
        >
          {!notif.is_read && (
            <span className={cn('absolute right-4 top-4 size-2 rounded-full', type.dot)} />
          )}
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', type.className)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p className={cn(
                'text-sm font-medium',
                !notif.is_read ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {notif.title}
              </p>
              {notif.action_url && (
                <ExternalLink className="size-3 text-muted-foreground/50 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <CategoryIcon className="size-3" />
                {category.label}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
              </span>
              {!notif.is_read && (
                <span className="text-[10px] text-primary font-medium">New</span>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn('text-xs gap-1', type.className)}>
              <Icon className="size-3" />
              {type.dot === 'bg-blue-500' ? 'Info' : type.dot === 'bg-emerald-500' ? 'Success' : type.dot === 'bg-amber-500' ? 'Warning' : 'Error'}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <CategoryIcon className="size-3 text-muted-foreground" />
              {category.label}
            </Badge>
          </div>
          <DialogTitle>{notif.title}</DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
          </p>
        </DialogHeader>
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap border-t pt-4">
          {notif.message}
        </div>
        {notif.action_url && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => navigate(notif.action_url)} className="gap-2">
              View Details <ExternalLink className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function NotificationsPage() {
  const { employee } = useAuthStore()
  const { data: notifications, isLoading } = useNotifications(employee?.id ?? '')
  const { mutateAsync: markAll } = useMarkNotificationsRead()
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')

  const filtered = (notifications ?? []).filter(n => {
    const matchCat = categoryFilter === 'all' || n.category === categoryFilter
    const matchRead = readFilter === 'all' || (readFilter === 'unread' ? !n.is_read : n.is_read)
    return matchCat && matchRead
  })

  const unreadCount = (notifications ?? []).filter(n => !n.is_read).length

  const handleMarkAllRead = async () => {
    if (!employee?.id) return
    await markAll(employee.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="h-5 rounded-full px-1.5 text-xs">{unreadCount}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Stay updated on everything happening in your organization</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5 shrink-0">
            <CheckCheck className="size-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Legend:</span>
        {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
          <Badge key={k} className={`text-xs gap-1.5 ${cfg.className}`}>
            <cfg.icon className="size-3" />
            {k === 'info' ? 'Info' : k === 'success' ? 'Success' : k === 'warning' ? 'Warning' : 'Error'}
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="leave">Leave</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-border p-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <Bell className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">No notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {readFilter === 'unread' ? "You're all caught up!" : 'No notifications match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.some(n => !n.is_read) && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unread</p>
              {filtered.filter(n => !n.is_read).map(n => (
                <NotificationItem key={n.id} notif={n} employeeId={employee?.id ?? ''} />
              ))}
            </div>
          )}
          {filtered.some(n => n.is_read) && (
            <div className="space-y-2 pt-2">
              {filtered.some(n => !n.is_read) && (
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Earlier</p>
              )}
              {filtered.filter(n => n.is_read).map(n => (
                <NotificationItem key={n.id} notif={n} employeeId={employee?.id ?? ''} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
