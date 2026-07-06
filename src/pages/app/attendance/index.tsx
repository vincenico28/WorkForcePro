import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { Clock, CheckCircle, XCircle, AlertCircle, TimerReset, MapPin, Download } from 'lucide-react'
import { useAttendance, useAttendanceRange, useClockIn, useClockOut, useTodayAttendance } from '@/hooks/use-attendance'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const ATT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  present: { label: 'Present', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  late: { label: 'Late', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: AlertCircle },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: XCircle },
  holiday: { label: 'Holiday', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', icon: CheckCircle },
  half_day: { label: 'Half Day', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400', icon: AlertCircle },
}

function ClockWidget() {
  const { employee } = useAuthStore()
  const { data: todayAtt, refetch } = useTodayAttendance(employee?.id ?? '')
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isIn = !!todayAtt?.clock_in && !todayAtt?.clock_out
  const isDone = !!todayAtt?.clock_in && !!todayAtt?.clock_out

  const handleClock = async () => {
    if (!employee?.id) { toast.error('No employee profile linked'); return }
    if (!isIn) {
      const t = toast.loading('Clocking in...')
      await clockIn.mutateAsync(employee.id)
      toast.dismiss(t)
      toast.success('Clocked in!', { description: `${format(new Date(), 'h:mm a')}` })
    } else {
      const t = toast.loading('Clocking out...')
      await clockOut.mutateAsync({ employeeId: employee.id, attendanceId: todayAtt!.id })
      toast.dismiss(t)
      toast.success('Clocked out!', { description: `${format(new Date(), 'h:mm a')}` })
    }
    refetch()
  }

  const totalWorked = todayAtt?.total_hours
    ? `${todayAtt.total_hours}h worked`
    : isIn && todayAtt?.clock_in
      ? `Since ${format(new Date(todayAtt.clock_in), 'h:mm a')}`
      : ''

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-sidebar to-sidebar/80 p-6">
        <div className="text-center">
          <div className="text-5xl font-bold tabular-nums tracking-tight text-sidebar-foreground">
            {format(time, 'HH:mm:ss')}
          </div>
          <div className="mt-1 text-sm text-sidebar-foreground/60">
            {format(time, 'EEEE, MMMM d, yyyy')}
          </div>

          <div className="mt-6 flex justify-center">
            {isDone ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5">
                <CheckCircle className="size-5 text-emerald-400" />
                <span className="text-sm font-medium text-sidebar-foreground">
                  Shift complete · {todayAtt?.total_hours}h
                </span>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleClock}
                disabled={clockIn.isPending || clockOut.isPending}
                className={`rounded-full px-8 ${isIn ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                <Clock className="mr-2 size-5" />
                {isIn ? 'Clock Out' : 'Clock In'}
              </Button>
            )}
          </div>

          {totalWorked && (
            <p className="mt-3 text-xs text-sidebar-foreground/50">{totalWorked}</p>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="font-semibold">{todayAtt?.clock_in ? format(new Date(todayAtt.clock_in), 'h:mm a') : '--:--'}</p>
            <p className="text-xs text-muted-foreground">Clock In</p>
          </div>
          <div>
            <p className="font-semibold">{todayAtt?.clock_out ? format(new Date(todayAtt.clock_out), 'h:mm a') : '--:--'}</p>
            <p className="text-xs text-muted-foreground">Clock Out</p>
          </div>
          <div>
            <p className="font-semibold">{todayAtt?.total_hours ? `${todayAtt.total_hours}h` : '0h'}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          <span>Office · GPS Verified</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AttendancePage() {
  const { can } = usePermissions()
  const [selectedDate] = useState(new Date())
  const { data: todayAttendance, isLoading } = useAttendance(selectedDate)

  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const { data: weekAttendance } = useAttendanceRange(startDate, endDate)

  const summary = {
    present: todayAttendance?.filter(a => a.status === 'present').length ?? 0,
    late: todayAttendance?.filter(a => a.status === 'late').length ?? 0,
    absent: todayAttendance?.filter(a => a.status === 'absent').length ?? 0,
    total: todayAttendance?.length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track and manage employee attendance</p>
        </div>
        {can.manageAttendance() && (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" />
            Export Report
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clock widget */}
        <ClockWidget />

        {/* Today's summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Today's Summary</CardTitle>
                <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">{summary.total} tracked</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Present', value: summary.present, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Late', value: summary.late, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Absent', value: summary.absent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : todayAttendance?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No attendance records for today</p>
              ) : (
                todayAttendance?.map((record) => {
                  const cfg = ATT_STATUS_CONFIG[record.status]
                  const Icon = cfg?.icon ?? Clock
                  return (
                    <div key={record.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {`${record.employees?.first_name?.[0] ?? ''}${record.employees?.last_name?.[0] ?? ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {record.employees?.first_name} {record.employees?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.employees?.position}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {record.clock_in && (
                          <span className="text-muted-foreground">
                            {format(new Date(record.clock_in), 'h:mm a')}
                          </span>
                        )}
                        {record.clock_out && (
                          <span className="text-muted-foreground">
                            → {format(new Date(record.clock_out), 'h:mm a')}
                          </span>
                        )}
                        {record.total_hours && (
                          <span className="font-medium">{record.total_hours}h</span>
                        )}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.className ?? ''}`}>
                          {cfg?.label ?? record.status}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Week Overview</CardTitle>
          <CardDescription>Attendance breakdown for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = subDays(new Date(), 6 - i)
              const dateStr = format(d, 'yyyy-MM-dd')
              const dayAtt = weekAttendance?.filter(a => a.date === dateStr) ?? []
              const present = dayAtt.filter(a => a.status === 'present' || a.status === 'late').length
              const absent = dayAtt.filter(a => a.status === 'absent').length
              const total = dayAtt.length
              const rate = total > 0 ? Math.round((present / total) * 100) : 0
              const isWeekend = [0, 6].includes(d.getDay())

              if (isWeekend) return null

              return (
                <div key={dateStr} className="flex items-center gap-4">
                  <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                    {format(d, 'EEE, MMM d')}
                  </span>
                  <div className="flex-1 rounded-full bg-muted h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {present}/{total} · {rate}%
                  </span>
                </div>
              )
            }).filter(Boolean)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
