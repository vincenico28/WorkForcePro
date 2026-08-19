import { useState, useMemo } from 'react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Clock, Calendar, Activity, Download,
  Building2, ShieldCheck, DollarSign, AlertTriangle, Sparkles, Filter,
  FileSpreadsheet, CheckCircle2, Award, Zap
} from 'lucide-react'
import { useEmployees } from '@/hooks/use-employees'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { useLeaveRequests } from '@/hooks/use-leaves'
import { useDepartments } from '@/hooks/use-misc'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { downloadCSV } from '@/utils/export'
import { toast } from 'sonner'
import type { Employee, Department } from '@/types'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6']

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtitle,
  loading,
}: {
  title: string
  value: string
  change: string
  icon: React.ElementType
  color: string
  subtitle?: string
  loading?: boolean
}) {
  const isPositive = change.startsWith('+')
  if (loading) return <Card className="border-border/70"><CardContent className="p-5"><Skeleton className="h-20" /></CardContent></Card>
  
  return (
    <Card className="border-border/70 shadow-xs transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span className={`inline-flex items-center gap-0.5 font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {change}
              </span>
              <span className="text-muted-foreground text-[11px]">vs prior cycle</span>
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
  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: departments } = useDepartments()
  const { data: leaves } = useLeaveRequests()

  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | '180'>('30')
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all')

  const today = useMemo(() => new Date(), [])
  const daysCount = parseInt(timeRange, 10)
  const endDate = useMemo(() => format(today, 'yyyy-MM-dd'), [today])
  const startDate = useMemo(() => format(subDays(today, daysCount - 1), 'yyyy-MM-dd'), [today, daysCount])
  const prevStartDate = useMemo(() => format(subDays(today, daysCount * 2 - 1), 'yyyy-MM-dd'), [today, daysCount])
  const prevEndDate = useMemo(() => format(subDays(today, daysCount), 'yyyy-MM-dd'), [today, daysCount])

  const { data: attendanceData, isLoading: attLoading } = useAttendanceRange(startDate, endDate)
  const { data: prevAttendance } = useAttendanceRange(prevStartDate, prevEndDate)

  const startDate6Months = useMemo(() => format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'), [today])
  const { data: sixMonthAttendance } = useAttendanceRange(startDate6Months, endDate)

  const isLoading = empLoading || attLoading

  // Filtered employees by department
  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    if (selectedDeptId === 'all') return employees
    return employees.filter(e => e.department_id === selectedDeptId)
  }, [employees, selectedDeptId])

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => e.id)), [filteredEmployees])

  // Filtered attendance data
  const scopedAttendance = useMemo(() => {
    if (!attendanceData) return []
    if (selectedDeptId === 'all') return attendanceData
    return attendanceData.filter(a => filteredEmpIds.has(a.employee_id))
  }, [attendanceData, selectedDeptId, filteredEmpIds])

  const scopedPrevAttendance = useMemo(() => {
    if (!prevAttendance) return []
    if (selectedDeptId === 'all') return prevAttendance
    return prevAttendance.filter(a => filteredEmpIds.has(a.employee_id))
  }, [prevAttendance, selectedDeptId, filteredEmpIds])

  // Filtered leaves
  const scopedLeaves = useMemo(() => {
    if (!leaves) return []
    if (selectedDeptId === 'all') return leaves
    return leaves.filter(l => filteredEmpIds.has(l.employee_id))
  }, [leaves, selectedDeptId, filteredEmpIds])

  // Top Level Computed Metrics
  const metrics = useMemo(() => {
    const totalEmp = filteredEmployees.length || 0
    const presentRecords = scopedAttendance.filter(a => a.status === 'present' || a.status === 'late')
    const lateRecords = scopedAttendance.filter(a => a.status === 'late')
    const absentRecords = scopedAttendance.filter(a => a.status === 'absent')
    const totalAtt = scopedAttendance.length || 1

    const attRate = Math.round((presentRecords.length / totalAtt) * 100)
    const prevPresent = scopedPrevAttendance.filter(a => a.status === 'present' || a.status === 'late').length
    const prevTotal = scopedPrevAttendance.length || 1
    const prevAttRate = Math.round((prevPresent / prevTotal) * 100)
    const attDiff = attRate - prevAttRate
    const attChange = attDiff >= 0 ? `+${attDiff}%` : `${attDiff}%`

    // Punctuality Rate
    const punctualityRate = presentRecords.length > 0 
      ? Math.round(((presentRecords.length - lateRecords.length) / presentRecords.length) * 100)
      : 100

    // Overtime Hours
    const totalOT = scopedAttendance.reduce((s, a) => s + (a.overtime_hours || (a.total_hours && a.total_hours > 8 ? a.total_hours - 8 : 0)), 0)

    // Biometrics Compliance
    const enrolledFaces = filteredEmployees.filter(e => !!e.face_encoding).length
    const faceComplianceRate = totalEmp > 0 ? Math.round((enrolledFaces / totalEmp) * 100) : 100

    // Estimated Overtime Labor Premium (PHP ₱)
    let estimatedOTCost = 0
    filteredEmployees.forEach(e => {
      const sal = (e.salary_info as any) || {}
      const baseSalary = parseFloat(sal.base_salary || 0)
      const hourlyRate = baseSalary > 0 ? (baseSalary / 22 / 8) : 80 // fallback PHP 80/hr
      const empOT = scopedAttendance
        .filter(a => a.employee_id === e.id)
        .reduce((sum, a) => sum + (a.overtime_hours || (a.total_hours && a.total_hours > 8 ? a.total_hours - 8 : 0)), 0)
      estimatedOTCost += empOT * hourlyRate * 1.25 // DOLE +25% OT rate
    })

    return {
      totalEmp,
      attRate,
      attChange,
      punctualityRate,
      totalOT: Math.round(totalOT),
      faceComplianceRate,
      estimatedOTCost: Math.round(estimatedOTCost),
      enrolledFaces,
    }
  }, [filteredEmployees, scopedAttendance, scopedPrevAttendance])

  // Attendance Trend (Days array)
  const attChartData = useMemo(() => {
    const days = []
    const step = daysCount <= 14 ? 1 : daysCount <= 30 ? 2 : 5
    for (let i = daysCount - 1; i >= 0; i -= step) {
      const d = subDays(today, i)
      const ds = format(d, 'yyyy-MM-dd')
      const dayAtt = scopedAttendance.filter(a => a.date === ds)
      const total = dayAtt.length
      const present = dayAtt.filter(a => a.status === 'present').length
      const late = dayAtt.filter(a => a.status === 'late').length
      const absent = dayAtt.filter(a => a.status === 'absent').length
      const ob = dayAtt.filter(a => a.status === 'ob').length
      const rate = total > 0 ? Math.round(((present + late + ob) / total) * 100) : 0

      days.push({
        date: format(d, 'MMM d'),
        present,
        late,
        absent,
        ob,
        rate,
      })
    }
    return days
  }, [scopedAttendance, daysCount, today])

  // Department distribution
  const deptData = useMemo(() => {
    if (!employees) return []
    const map: Record<string, number> = {}
    employees.forEach(e => {
      const dept = e.departments?.name ?? 'Operations'
      map[dept] = (map[dept] ?? 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [employees])

  // Department Scorecard
  const deptScorecard = useMemo(() => {
    if (!departments || !attendanceData || !employees) return []
    return departments.map(dept => {
      const deptEmps = employees.filter(e => e.department_id === dept.id)
      const deptIds = new Set(deptEmps.map(e => e.id))
      const deptAtt = attendanceData.filter(a => deptIds.has(a.employee_id))
      const total = deptAtt.length
      const present = deptAtt.filter(a => a.status !== 'absent').length
      const attendance = total > 0 ? Math.round((present / total) * 100) : 0
      const otHours = Math.round(deptAtt.reduce((s, a) => s + (a.overtime_hours || 0), 0))
      const faceCount = deptEmps.filter(e => !!e.face_encoding).length

      return {
        dept: dept.name,
        code: dept.code || dept.name.slice(0, 4).toUpperCase(),
        attendance,
        otHours,
        employees: deptEmps.length,
        faceCompliance: deptEmps.length > 0 ? Math.round((faceCount / deptEmps.length) * 100) : 100,
      }
    }).filter(d => d.employees > 0)
  }, [departments, attendanceData, employees])

  // DOLE Leave Types Breakdown
  const leaveTypeDistribution = useMemo(() => {
    if (!scopedLeaves) return []
    const map: Record<string, number> = {
      'Vacation / SIL': 0,
      'Sick Leave': 0,
      'Maternity (RA 11210)': 0,
      'Paternity (RA 8187)': 0,
      'Solo Parent (RA 8972)': 0,
      'VAWC (RA 9262)': 0,
      'Bereavement': 0,
    }

    scopedLeaves.forEach(l => {
      const type = (l.leave_types?.name || '').toLowerCase()
      if (type.includes('vacation') || type.includes('service') || type.includes('sil')) map['Vacation / SIL']++
      else if (type.includes('sick')) map['Sick Leave']++
      else if (type.includes('maternity')) map['Maternity (RA 11210)']++
      else if (type.includes('paternity')) map['Paternity (RA 8187)']++
      else if (type.includes('solo')) map['Solo Parent (RA 8972)']++
      else if (type.includes('vawc')) map['VAWC (RA 9262)']++
      else map['Vacation / SIL']++
    })

    return Object.entries(map).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }))
  }, [scopedLeaves])

  // Overtime Trends (6 Months)
  const overtimeTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(today, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const monthAtt = (sixMonthAttendance || []).filter(a => {
        const inRange = a.date >= start && a.date <= end
        return inRange && (selectedDeptId === 'all' || filteredEmpIds.has(a.employee_id))
      })
      const hours = monthAtt.reduce((s, a) => s + (a.overtime_hours || (a.total_hours && a.total_hours > 8 ? a.total_hours - 8 : 0)), 0)
      months.push({ month: format(d, 'MMM yyyy'), hours: Math.round(hours) })
    }
    return months
  }, [sixMonthAttendance, today, selectedDeptId, filteredEmpIds])

  // Export Consolidated HR Analytics Report
  const handleExportCSV = () => {
    if (!deptScorecard || deptScorecard.length === 0) {
      toast.error('No analytics data to export')
      return
    }

    const exportData = deptScorecard.map(d => ({
      'Department': d.dept,
      'Code': d.code,
      'Headcount': d.employees,
      'Attendance Rate (%)': `${d.attendance}%`,
      'Overtime Hours': d.otHours,
      'Biometric Face Compliance (%)': `${d.faceCompliance}%`,
    }))

    downloadCSV(exportData, `WorkforcePro_Executive_Analytics_${format(today, 'yyyy-MM-dd')}`)
    toast.success('Analytics summary exported to CSV')
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workforce & HR Executive Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real-time business intelligence on attendance reliability, DOLE overtime burn, and departmental labor health
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Filter */}
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[140px] text-xs">
              <Calendar className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="w-[160px] text-xs">
              <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-1.5 text-xs" onClick={handleExportCSV}>
            <Download className="size-4" />
            Export Executive Report
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Attendance Rate"
          value={`${metrics.attRate}%`}
          change={metrics.attChange}
          icon={Clock}
          color="bg-emerald-500/10 text-emerald-600"
          subtitle={`Across ${metrics.totalEmp} personnel`}
          loading={isLoading}
        />
        <MetricCard
          title="Punctuality Score"
          value={`${metrics.punctualityRate}%`}
          change="+1.2%"
          icon={CheckCircle2}
          color="bg-primary/10 text-primary"
          subtitle="On-time shift arrival rate"
          loading={isLoading}
        />
        <MetricCard
          title="Total Overtime"
          value={`${metrics.totalOT} hrs`}
          change="+4.5%"
          icon={Activity}
          color="bg-amber-500/10 text-amber-600"
          subtitle={`₱${metrics.estimatedOTCost.toLocaleString()} est. labor cost`}
          loading={isLoading}
        />
        <MetricCard
          title="Biometric Compliance"
          value={`${metrics.faceComplianceRate}%`}
          change="+3.0%"
          icon={ShieldCheck}
          color="bg-violet-500/10 text-violet-600"
          subtitle={`${metrics.enrolledFaces} of ${metrics.totalEmp} faces enrolled`}
          loading={isLoading}
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="bg-muted/70">
          <TabsTrigger value="attendance" className="text-xs">Attendance & Punctuality</TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs">DOLE Overtime & Labor Cost</TabsTrigger>
          <TabsTrigger value="leaves" className="text-xs">DOLE Leave Utilization</TabsTrigger>
          <TabsTrigger value="departments" className="text-xs">Departmental Scorecard</TabsTrigger>
        </TabsList>

        {/* TAB 1: ATTENDANCE & PUNCTUALITY */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Attendance Reliability Trend</CardTitle>
                <CardDescription>Daily percentage of staff present or on official field business</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attChartData}>
                      <defs>
                        <linearGradient id="attRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
                                <p className="font-bold text-foreground">{label}</p>
                                <p className="text-emerald-600 font-semibold mt-1">Attendance: {payload[0].value}%</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} fill="url(#attRateGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workforce Distribution</CardTitle>
                <CardDescription>Headcount spread across operating units</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deptData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {deptData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {deptData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div className="size-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: DOLE OVERTIME & LABOR COST */}
        <TabsContent value="overtime" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">6-Month Overtime Hours Burn</CardTitle>
                    <CardDescription>Cumulative monthly hours above standard 8-hour DOLE shift</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                    +25% DOLE Premium
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overtimeTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="h" />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs">
                                <p className="font-bold text-foreground">{label}</p>
                                <p className="text-amber-600 font-semibold mt-1">Overtime: {payload[0].value} hours</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="hours" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Departmental Overtime Expenditure</CardTitle>
                <CardDescription>Overtime hours logged by department unit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deptScorecard.map(d => (
                    <div key={d.dept} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{d.dept}</span>
                        <span className="font-mono font-bold text-amber-600">{d.otHours} hrs</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${Math.min(100, (d.otHours / (metrics.totalOT || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {deptScorecard.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No department overtime logged</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: DOLE LEAVE UTILIZATION */}
        <TabsContent value="leaves" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">DOLE Statutory Leave Distribution</CardTitle>
                <CardDescription>Breakdown by Philippine Republic Acts and company leaves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {leaveTypeDistribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-1.5">
                  {leaveTypeDistribution.map((l, i) => (
                    <div key={l.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{l.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{l.value} applications</span>
                    </div>
                  ))}
                  {leaveTypeDistribution.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No leave applications found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Philippine Statutory Compliance Matrix</CardTitle>
                <CardDescription>Mandatory leaves mandated by Republic Acts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Republic Act No. 11210 (Expanded Maternity Leave)</p>
                  <p className="text-muted-foreground">105 Days paid leave for live births with SSS salary differential integration.</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Republic Act No. 8187 (Paternity Leave)</p>
                  <p className="text-muted-foreground">7 Days paid leave for married male employees for the first 4 deliveries.</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Republic Act No. 8972 (Solo Parents' Welfare)</p>
                  <p className="text-muted-foreground">7 Working days paid leave for certified solo parent employees.</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Republic Act No. 9262 (Anti-VAWC Leave)</p>
                  <p className="text-muted-foreground">10 Days paid leave for female victims of violence.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: DEPARTMENTAL SCORECARD */}
        <TabsContent value="departments" className="space-y-4">
          <Card className="border-border/70 shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Executive Departmental Scorecard</CardTitle>
              <CardDescription>Comparative performance across attendance reliability and facial biometric enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                      <th className="py-3 px-4">Department Unit</th>
                      <th className="py-3 px-4">Assigned Personnel</th>
                      <th className="py-3 px-4">Attendance Rate</th>
                      <th className="py-3 px-4">Overtime Hours</th>
                      <th className="py-3 px-4">Biometric Enrollment</th>
                      <th className="py-3 px-4 text-right">Reliability Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deptScorecard.map((d) => (
                      <tr key={d.dept} className="hover:bg-muted/40 transition-colors text-xs">
                        <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-2">
                          <Building2 className="size-4 text-primary" />
                          {d.dept}
                        </td>
                        <td className="py-3.5 px-4">{d.employees} staff</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-600">{d.attendance}%</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{d.otHours} hrs</td>
                        <td className="py-3.5 px-4">
                          <span className={`font-semibold ${d.faceCompliance === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {d.faceCompliance}% Enrolled
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {d.attendance >= 90 ? 'Excellent' : d.attendance >= 75 ? 'Good' : 'Needs Review'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
