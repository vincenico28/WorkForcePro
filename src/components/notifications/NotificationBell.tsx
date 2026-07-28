import { useState } from 'react'
import { Bell, Check, Loader2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="size-4 text-emerald-500" />
      case 'warning': return <AlertTriangle className="size-4 text-amber-500" />
      case 'error': return <XCircle className="size-4 text-rose-500" />
      default: return <Info className="size-4 text-blue-500" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 rounded-full">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex size-2 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground ring-2 ring-background">
              {/* Optional: Add number inside if count < 100 */}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Check className="size-3 mr-1" />}
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !notifications?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="size-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground">When you get updates, they'll show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 cursor-default",
                    !n.is_read ? "bg-muted/20" : ""
                  )}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm leading-none", !n.is_read ? "font-semibold" : "font-medium")}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/80 mt-1.5">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="size-2 shrink-0 rounded-full bg-primary mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
