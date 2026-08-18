import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, Check, Loader2, Info, AlertTriangle, CheckCircle, XCircle, Megaphone, Volume2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications'
import { playNotificationSound } from '@/utils/notification-sound'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const getIcon = (type: string, category?: string) => {
    if (category === 'announcement') {
      return <Megaphone className="size-4 text-purple-500" />
    }
    switch (type) {
      case 'success': return <CheckCircle className="size-4 text-emerald-500" />
      case 'warning': return <AlertTriangle className="size-4 text-amber-500" />
      case 'error': return <XCircle className="size-4 text-rose-500" />
      default: return <Info className="size-4 text-blue-500" />
    }
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read) {
      await markRead.mutateAsync(n.id)
    }
    if (n.action_url) {
      setOpen(false)
      navigate(n.action_url)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 rounded-full">
          <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
            transition={{ repeat: Infinity, repeatDelay: 6, duration: 0.6 }}
          >
            <Bell className="size-4" />
          </motion.div>
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-primary"
              title="Test notification chime sound"
              onClick={(e) => {
                e.stopPropagation()
                playNotificationSound()
              }}
            >
              <Volume2 className="size-3.5" />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Check className="size-3 mr-1" />}
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[380px]">
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
            <div className="divide-y divide-border/40">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/60 cursor-pointer text-left",
                    !n.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(n.type, n.category)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn("text-xs leading-snug", !n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
