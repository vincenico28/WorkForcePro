import { useMemo } from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Users, Clock, Calendar, Activity, Download } from 'lucide-react'
import { useEmployees } from '@/hooks/use-employees'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { useLeaveRequests } from '@/hooks/use-leaves'
import { useDepartments } from '@/hooks/use-misc'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadCSV } from '@/utils/export'
import { toast } from 'sonner'

function MetricCard({
  title, value, change, icon: Icon, color, subtitle, loading,
}: {
  title: string; value: string; change: string; icon: React.ElementType
  color: string; subtitle?: string; loading?: boolean
}) {
  const isPositive = change.startsWith('+')
  if (loading) return <Card><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            <div className="mt-2 flex items-center gap-1 text-xs">
              {isPositive
                ? <TrendingUp className="size-3 text-emerald-500" />
                : <TrendingDown className="size-3 text-destructive" />}
              <span className={isPositive ? 'text-emerald-600' : 'text-destructive'}>{change}</span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          </div>
          <div className={`flex size-11 items-center justify-center rounded-xl ${color}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { data: employees, isLoading: empLoading, error: empErr } = useEmployees()
  const { data: departments, error: deptErr } = useDepartments()

  const today = new Date()
  const endDate = format(today, 'yyyy-MM-dd')
  const startDate30 = format(subDays(today, 29), 'yyyy-MM-dd')
  const prevStartDate = format(subDays(today, 59), 'yyyy-MM-dd')
  const prevEndDate = format(subDays(today, 30), 'yyyy-MM-dd')

  const { data: attendanceData, isLoading: attLoading, error: attErr } = useAttendanceRange(startDate30, endDate)
  const { data: prevAttendance } = useAttendanceRange(prevStartDate, prevEndDate)
  
  const startDate6Months = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd')
  const { data: sixMonthAttendance, error: sixMonthErr } = useAttendanceRange(startDate6Months, endDate)

  const { data: leaves, error: leaveErr } = useLeaveRequests()

  const isLoading = empLoading || attLoading

  // Attendance trend chart (last 30 days)
  const attChartData = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i)
      const ds = format(d, 'yyyy-MM-dd')
      const dayAtt = attendanceData?.filter(a => a.date === ds) ?? []
      const total = dayAtt.length
      days.push({
        date: format(d, 'MMM d'),
        present: dayAtt.filter(a => a.status === 'present').length,
        late: dayAtt.filter(a => a.status === 'late').length,
        absent: dayAtt.filter(a => a.status === 'absent').length,
        rate: total > 0 ? Math.round((dayAtt.filter(a => a.status !== 'absent').length / total) * 100) : 0,
      })
    }
    return days
  }, [attendanceData])

  // Department distribution
  const deptData = useMemo(() => {
    if (!employees) return []
    const map: Record<string, number> = {}
    employees.forEach(e => {
      const dept = e.departments?.name ?? 'Other'
      map[dept] = (map[dept] ?? 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [employees])

  // Department scorecard from real data
  const deptScorecard = useMemo(() => {
    if (!departments || !attendanceData || !employees) return []
    return departments.map(dept => {
      const deptEmps = employees.filter(e => e.department_id === dept.id)
      const deptIds = new Set(deptEmps.map(e => e.id))
      const deptAtt = attendanceData.filter(a => deptIds.has(a.employee_id))
      const total = deptAtt.length
      const present = deptAtt.filter(a => a.status !== 'absent').length
      const attendance = total > 0 ? Math.round((present / total) * 100) : 0
      return { dept: dept.name, attendance, employees: deptEmps.length }
    }).filter(d => d.employees > 0).slice(0, 6)
  }, [departments, attendanceData, employees])

  // Leave trends by month (last 6 months, real data)
  const leaveTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const monthLeaves = leaves?.filter(l => l.start_date >= start && l.start_date <= end) ?? []
      months.push({
        month: format(d, 'MMM'),
        approved: monthLeaves.filter(l => l.status === 'approved').length,
        pending: monthLeaves.filter(l => l.status === 'pending').length,
        rejected: monthLeaves.filter(l => l.status === 'rejected').length,
      })
    }
    return months
  }, [leaves])

  // Overtime trend from real attendance
  const overtimeTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const monthAtt = sixMonthAttendance?.filter(a => a.date >= start && a.date <= end) ?? []
      const hours = monthAtt.reduce((s, a) => s + (a.overtime_hours ?? 0), 0)
      months.push({ month: format(d, 'MMM'), hours: Math.round(hours) })
    }
    return months
  }, [sixMonthAttendance])

  // Computed metrics
  const metrics = useMemo(() => {
    const totalEmp = employees?.length ?? 0
    const prevEmp = totalEmp // simplified — would need historical data
    const empChange = '+0%'

    const present = attendanceData?.filter(a => a.status !== 'absent').length ?? 0
    const totalAtt = attendanceData?.length ?? 1
    const attRate = Math.round((present / totalAtt) * 100)
    const prevPresent = prevAttendance?.filter(a => a.status !== 'absent').length ?? 0
    const prevTotal = prevAttendance?.length ?? 1
    const prevRate = Math.round((prevPresent / prevTotal) * 100)
    const attChange = attRate >= prevRate ? `+${attRate - prevRate}%` : `-${prevRate - attRate}%`

    const approvedLeaves = leaves?.filter(l => {
      const thisMonth = format(today, 'yyyy-MM')
      return l.status === 'approved' && l.start_date?.startsWith(thisMonth)
    }).length ?? 0
    const leaveRate = totalEmp > 0 ? ((approvedLeaves / totalEmp) * 100).toFixed(1) : '0'

    const overtimeHrs = Math.round(attendanceData?.reduce((s, a) => s + (a.overtime_hours ?? 0), 0) ?? 0)

    return { totalEmp, attRate, attChange, leaveRate, overtimeHrs }
  }, [employees, attendanceData, prevAttendance, leaves])

  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

  const attConfig = {
    rate: { label: 'Attendance Rate %', color: 'var(--chart-1)' },
    present: { label: 'Present', color: 'var(--chart-2)' },
    late: { label: 'Late', color: 'var(--chart-3)' },
    absent: { label: 'Absent', color: 'var(--chart-4)' },
  }

  const leaveConfig = {
    approved: { label: 'Approved', color: 'var(--chart-2)' },
    pending: { label: 'Pending', color: 'var(--chart-3)' },
    rejected: { label: 'Rejected', color: 'var(--chart-5)' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Workforce insights and performance metrics</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={() => {
            if (!deptData || deptData.length === 0) {
              toast.error('No analytics data to export')
              return
            }
            downloadCSV(deptData, `Analytics_Report_${format(today, 'MMM_yyyy')}`)
            toast.success('Analytics report downloaded successfully')
          }}
        >
          <Download className="size-4" />Export Report
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Workforce" value={String(metrics.totalEmp)} change="+0%"
          icon={Users} color="bg-primary/10 text-primary"
          subtitle="across all departments" loading={isLoading}
        />
        <MetricCard
          title="Avg Attendance" value={`${metrics.attRate}%`} change={metrics.attChange}
          icon={Clock} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"
          subtitle="last 30 days" loading={isLoading}
        />
        <MetricCard
          title="Leave Rate" value={`${metrics.leaveRate}%`} change="-0%"
          icon={Calendar} color="bg-amber-100 text-amber-600 dark:bg-amber-950/50"
          subtitle="approved leave this month" loading={isLoading}
        />
        <MetricCard
          title="Overtime Hrs" value={String(metrics.overtimeHrs)} change="+0%"
          icon={Activity} color="bg-rose-100 text-rose-600 dark:bg-rose-950/50"
          subtitle="last 30 days total" loading={isLoading}
        />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
          <TabsTrigger value="leaves">Leave Trends</TabsTrigger>
          <TabsTrigger value="performance">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Attendance Rate — Last 30 Days</CardTitle>
                <CardDescription>Daily attendance percentage trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={attConfig} className="min-h-[260px] w-full">
                  <AreaChart data={attChartData.filter((_, i) => i % 2 === 0)}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={3} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area dataKey="rate" fill="url(#rateGrad)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <PieChart width={200} height={200}>
                    <Pie data={deptData} cx={95} cy={95} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
                <div className="mt-2 space-y-1.5">
                  {deptData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance by Status — Last 30 Days</CardTitle>
                <CardDescription>Present vs Late vs Absent</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={attConfig} className="min-h-[240px] w-full">
                  <BarChart data={attChartData.filter((_, i) => i % 3 === 0)}>
                    <CartesianGrid vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="present" fill="var(--color-present)" radius={[3, 3, 0, 0]} stackId="a" />
                    <Bar dataKey="late" fill="var(--color-late)" radius={[0, 0, 0, 0]} stackId="a" />
                    <Bar dataKey="absent" fill="var(--color-absent)" radius={[0, 0, 0, 0]} stackId="a" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overtime Hours Trend</CardTitle>
                <CardDescription>Monthly overtime hours across all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ hours: { label: 'Hours', color: 'var(--chart-4)' } }} className="min-h-[240px] w-full">
                  <BarChart data={overtimeTrend}>
                    <CartesianGrid vertical={false} className="stroke-border" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="hours" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Request Trends</CardTitle>
              <CardDescription>Monthly breakdown by status — last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={leaveConfig} className="min-h-[300px] w-full">
                <BarChart data={leaveTrend} barCategoryGap="35%">
                  <CartesianGrid vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="approved" fill="var(--color-approved)" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" fill="var(--color-pending)" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="rejected" fill="var(--color-rejected)" radius={[0, 0, 0, 0]} stackId="a" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Attendance Radar</CardTitle>
                <CardDescription>Attendance rate per department — last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ attendance: { label: 'Attendance %', color: 'var(--chart-1)' } }} className="min-h-[260px] w-full">
                  <RadarChart data={deptScorecard}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="dept" tick={{ fontSize: 11 }} />
                    <Radar name="Attendance" dataKey="attendance" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} />
                    <Tooltip content={<ChartTooltipContent />} />
                  </RadarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Department Scorecard</CardTitle>
                <CardDescription>Attendance rate by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deptScorecard.map(d => (
                    <div key={d.dept} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{d.dept}</span>
                        <span className="text-muted-foreground">{d.attendance}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${d.attendance}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{d.employees} employees</p>
                    </div>
                  ))}
                  {deptScorecard.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No department data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
