import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Clock, Calendar, TrendingUp, TrendingDown, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, UserCheck, Timer, Award,
  Building2, BarChart2, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { useEmployees } from '@/hooks/use-employees'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { useLeaveRequests } from '@/hooks/use-leaves'
import { useAnnouncements } from '@/hooks/use-misc'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaveRequest } from '@/types'

const DEPT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

function StatCard({
  title, value, change, icon: Icon, color, loading, subtitle,
}: {
  title: string; value: string | number; change?: string; icon: React.ElementType
  color: string; loading?: boolean; subtitle?: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              {change && (
                <div className="flex items-center gap-1 text-xs">
                  {change.startsWith('+') ? (
                    <TrendingUp className="size-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="size-3 text-destructive" />
                  )}
                  <span className={change.startsWith('+') ? 'text-emerald-600' : 'text-destructive'}>
                    {change} vs last week
                  </span>
                </div>
              )}
            </div>
            <div className={`flex size-11 items-center justify-center rounded-xl ${color}`}>
              <Icon className="size-5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const getLeaveStatusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[status] ?? map.pending
}

export default function DashboardPage() {
  const { employee } = useAuthStore()
  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: leaves } = useLeaveRequests()
  const { data: announcements } = useAnnouncements()

  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), 13), 'yyyy-MM-dd')
  const { data: attendanceData } = useAttendanceRange(startDate, endDate)

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayAtt = attendanceData?.filter(a => a.date === today) ?? []
    const presentToday = todayAtt.filter(a => a.status === 'present' || a.status === 'late').length
    const lateToday = todayAtt.filter(a => a.status === 'late').length
    const absentToday = todayAtt.filter(a => a.status === 'absent').length
    const onLeave = employees?.filter(e => e.status === 'on_leave').length ?? 0
    const pendingLeaves = leaves?.filter(l => l.status === 'pending').length ?? 0
    const totalActive = employees?.filter(e => e.status === 'active' || e.status === 'on_leave').length ?? 0

    // Real metrics from 14-day attendance window
    const weekdayRecords = attendanceData?.filter(a => {
      const d = new Date(a.date).getDay()
      return d !== 0 && d !== 6
    }) ?? []
    const totalTracked = weekdayRecords.length
    const totalPresent = weekdayRecords.filter(a => a.status === 'present' || a.status === 'late').length
    const avgAttendanceRate = totalTracked > 0 ? Math.round((totalPresent / totalTracked) * 100) : 0
    const leaveUtilizationRate = totalActive > 0 ? Math.round((onLeave / totalActive) * 100) : 0
    const lateRate = totalPresent > 0 ? Math.round((weekdayRecords.filter(a => a.status === 'late').length / totalTracked) * 100) : 0

    return { presentToday, lateToday, absentToday, onLeave, pendingLeaves, totalActive, avgAttendanceRate, leaveUtilizationRate, lateRate }
  }, [employees, attendanceData, leaves])

  const attendanceChartData = useMemo(() => {
    const days: Array<{ date: string; present: number; late: number; absent: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayAtt = attendanceData?.filter(a => a.date === d) ?? []
      days.push({
        date: format(subDays(new Date(), i), 'EEE'),
        present: dayAtt.filter(a => a.status === 'present').length,
        late: dayAtt.filter(a => a.status === 'late').length,
        absent: dayAtt.filter(a => a.status === 'absent').length,
      })
    }
    return days
  }, [attendanceData])

  const deptChartData = useMemo(() => {
    if (!employees) return []
    const deptMap: Record<string, number> = {}
    employees.forEach(e => {
      const dept = e.departments?.name ?? 'Other'
      deptMap[dept] = (deptMap[dept] ?? 0) + 1
    })
    return Object.entries(deptMap).map(([name, value]) => ({ name, value }))
  }, [employees])

  const leaveStatusData = useMemo(() => {
    if (!leaves) return []
    const map: Record<string, number> = {}
    leaves.forEach(l => { map[l.status] = (map[l.status] ?? 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [leaves])

  const recentLeaves = leaves?.slice(0, 5) ?? []

  const attChartConfig = {
    present: { label: 'Present', color: 'var(--chart-2)' },
    late: { label: 'Late', color: 'var(--chart-3)' },
    absent: { label: 'Absent', color: 'var(--chart-4)' },
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {employee?.first_name ?? 'User'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Here's what's happening today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/attendance">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Clock className="size-3.5" />
              Clock In/Out
            </Button>
          </Link>
          <Link to="/app/leaves">
            <Button size="sm" className="gap-1.5">
              <Calendar className="size-3.5" />
              Request Leave
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Total Employees', value: empLoading ? '...' : stats.totalActive, icon: Users,
            color: 'bg-primary/10 text-primary', loading: empLoading,
            subtitle: 'active workforce',
          },
          {
            title: 'Present Today', value: empLoading ? '...' : stats.presentToday, icon: UserCheck,
            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50',
            loading: empLoading,
            subtitle: `${stats.totalActive > 0 ? Math.round((stats.presentToday / stats.totalActive) * 100) : 0}% attendance rate`,
          },
          {
            title: 'On Leave', value: empLoading ? '...' : stats.onLeave, icon: Calendar,
            color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50',
            loading: empLoading, subtitle: `${stats.pendingLeaves} pending requests`,
          },
          {
            title: 'Late Arrivals', value: empLoading ? '...' : stats.lateToday, icon: Timer,
            color: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50',
            loading: empLoading, subtitle: 'clocked in after 9 AM',
          },
        ].map((s, i) => (
          <motion.div key={s.title} initial="hidden" animate="visible" custom={i} variants={fadeUp}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Attendance chart */}
        <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Attendance Overview</CardTitle>
                <CardDescription>Last 7 days attendance breakdown</CardDescription>
              </div>
              <Link to="/app/attendance">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ChartContainer config={attChartConfig} className="min-h-[220px] w-full">
                <BarChart data={attendanceChartData} barCategoryGap="30%">
                  <CartesianGrid vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="present" fill="var(--color-present)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="late" fill="var(--color-late)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="absent" fill="var(--color-absent)" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department breakdown */}
        <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">By Department</CardTitle>
              <CardDescription>Employee distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 flex justify-center">
                <PieChart width={160} height={160}>
                  <Pie data={deptChartData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {deptChartData.map((_, idx) => (
                      <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2">
                {deptChartData.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="text-xs font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent Leave Requests */}
        <motion.div initial="hidden" animate="visible" custom={6} variants={fadeUp} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Leave Requests</CardTitle>
                <CardDescription>Recent submissions requiring attention</CardDescription>
              </div>
              <Link to="/app/leaves">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View all <ArrowRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLeaves.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No recent leave requests</div>
              ) : (
                recentLeaves.map((lr: LeaveRequest) => (
                  <div key={lr.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40">
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {`${lr.employees?.first_name?.[0] ?? ''}${lr.employees?.last_name?.[0] ?? ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {lr.employees?.first_name} {lr.employees?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lr.leave_types?.name} · {lr.total_days} day{lr.total_days !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getLeaveStatusColor(lr.status)}`}>
                        {lr.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(lr.start_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcements + Quick Stats */}
        <motion.div initial="hidden" animate="visible" custom={7} variants={fadeUp} className="flex flex-col gap-4 lg:col-span-2">
          {/* Quick metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Avg Attendance Rate', value: stats.avgAttendanceRate, color: 'bg-primary' },
                { label: 'Leave Utilization', value: stats.leaveUtilizationRate, color: 'bg-amber-500' },
                { label: 'Late Arrivals Rate', value: stats.lateRate, color: 'bg-rose-500' },
              ].map((m) => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium">{m.value}%</span>
                  </div>
                  <Progress value={m.value} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements?.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="space-y-1.5 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    {ann.is_pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                    <Badge
                      className={`text-[10px] ${ann.type === 'urgent' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}
                    >
                      {ann.type}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium leading-tight">{ann.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{ann.content}</p>
                </div>
              ))}
              {(!announcements || announcements.length === 0) && (
                <p className="py-4 text-center text-xs text-muted-foreground">No announcements</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
