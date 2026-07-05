import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Clock, Calendar, BarChart3, Building2,
  Settings, Bell, Megaphone, DollarSign, Star, Search, ArrowRight, Timer,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useEmployees } from '@/hooks/use-employees'

const NAV_ITEMS = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard, shortcut: 'D' },
  { title: 'Employees', url: '/app/employees', icon: Users, shortcut: 'E' },
  { title: 'Departments', url: '/app/departments', icon: Building2 },
  { title: 'Attendance', url: '/app/attendance', icon: Clock, shortcut: 'A' },
  { title: 'Timesheet', url: '/app/timesheet', icon: Timer, shortcut: 'T' },
  { title: 'Leave Management', url: '/app/leaves', icon: Calendar, shortcut: 'L' },
  { title: 'Schedule', url: '/app/schedule', icon: Calendar },
  { title: 'Payroll', url: '/app/payroll', icon: DollarSign },
  { title: 'Performance', url: '/app/performance', icon: Star },
  { title: 'Analytics', url: '/app/analytics', icon: BarChart3 },
  { title: 'Announcements', url: '/app/announcements', icon: Megaphone },
  { title: 'Notifications', url: '/app/notifications', icon: Bell },
  { title: 'Settings', url: '/app/settings', icon: Settings, shortcut: 'S' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  on_leave: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  terminated: 'bg-red-100 text-red-700',
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { data: employees } = useEmployees()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const go = (url: string) => {
    navigate(url)
    onOpenChange(false)
    setSearch('')
  }

  const filteredEmployees = (employees ?? [])
    .filter(e => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q) ||
        (e.departments?.name ?? '').toLowerCase().includes(q) ||
        (e.employee_id ?? '').toLowerCase().includes(q)
      )
    })
    .slice(0, 6)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search employees, pages, actions..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results for "{search}"</p>
          </div>
        </CommandEmpty>

        {filteredEmployees.length > 0 && (
          <CommandGroup heading="Employees">
            {filteredEmployees.map(emp => (
              <CommandItem
                key={emp.id}
                value={`${emp.first_name} ${emp.last_name} ${emp.position} ${emp.employee_id}`}
                onSelect={() => go(`/app/employees/${emp.id}`)}
                className="gap-3"
              >
                <Avatar className="size-7 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 text-[10px] font-semibold text-primary">
                    {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.position} · {emp.departments?.name}</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[emp.status] ?? ''}`}>
                  {emp.status.replace('_', ' ')}
                </Badge>
              </CommandItem>
            ))}
            {(employees?.length ?? 0) > 6 && search && (
              <CommandItem onSelect={() => go('/app/employees')} className="text-muted-foreground">
                <ArrowRight className="mr-2 size-3.5" />
                View all employees matching "{search}"
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {filteredEmployees.length > 0 && <CommandSeparator />}

        <CommandGroup heading="Navigation">
          {NAV_ITEMS.filter(item =>
            !search || item.title.toLowerCase().includes(search.toLowerCase())
          ).map(item => (
            <CommandItem
              key={item.url}
              value={item.title}
              onSelect={() => go(item.url)}
              className="gap-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border border-border bg-muted/50">
                <item.icon className="size-3.5 text-muted-foreground" />
              </div>
              <span>{item.title}</span>
              {item.shortcut && (
                <CommandShortcut>⌘{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
