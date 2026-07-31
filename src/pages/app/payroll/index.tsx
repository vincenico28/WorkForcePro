import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  DollarSign, Users, TrendingUp, TrendingDown, Download,
  CheckCircle, Clock, AlertCircle, ChevronRight, CreditCard,
  Wallet, PieChart, ArrowUpRight, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { useEmployees } from '@/hooks/use-employees'
import { useTimesheetEntries } from '@/hooks/use-timesheets'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import { downloadCSV } from '@/utils/export'

const chartConfig = {
  gross: { label: 'Est. Gross', color: 'var(--chart-1)' },
  hours: { label: 'Hours', color: 'var(--chart-2)' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)

// Derive estimated gross from hours worked (using PHP 250/h average if no salary info)
function estimateGross(totalHours: number, overtimeHours: number, baseHourly = 250) {
  const regular = Math.max(0, totalHours - overtimeHours)
  return regular * baseHourly + overtimeHours * baseHourly * 1.5
}

const DEDUCTION_RATE = 0.24 // flat 24% for simplicity

function PayslipDialog({ 
  open, 
  onOpenChange, 
  data,
  period
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  data: any;
  period: string;
}) {
  if (!data) return null
  const { emp, totalHours, overtimeHours, gross, deductions, net } = data

  const [isGenerating, setIsGenerating] = useState(false)

  const handlePrint = async () => {
    const input = document.getElementById('payslip-print-area')
    if (!input) return

    setIsGenerating(true)
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`Payslip_${emp.first_name}_${emp.last_name}_${period.replace(/ /g, '_')}.pdf`)
      
      toast.success('Payslip downloaded successfully')
    } catch (error) {
      console.error('Failed to generate PDF', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white text-black sm:rounded-xl">
        {/* We use a printable area class that can be targeted by CSS */}
        <div id="payslip-print-area" className="print-area p-8 bg-white">
          <DialogHeader className="mb-8 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-bold text-black tracking-tight">PAYSLIP</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">Pay Period: {period}</p>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-xl text-violet-600">Workforce Pro</h3>
                <p className="text-sm text-gray-500">123 Corporate Blvd.</p>
                <p className="text-sm text-gray-500">San Francisco, CA 94103</p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-12 mb-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Employee Details</p>
              <p className="font-bold text-lg">{emp.first_name} {emp.last_name}</p>
              <p className="text-sm text-gray-600">{emp.position}</p>
              <p className="text-sm text-gray-600">{emp.departments?.name || 'No Department'}</p>
              <p className="text-sm text-gray-600 mt-2">ID: {emp.id.split('-')[0]}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</p>
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-sm text-gray-600">Payment Method</span>
                <span className="text-sm font-medium">Direct Deposit</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-1">
                <span className="text-sm text-gray-600">Bank</span>
                <span className="text-sm font-medium">Chase ****1234</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Hours/Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4">Regular Base Pay</td>
                  <td className="text-right py-3 px-4 text-gray-500">{Math.max(0, totalHours - overtimeHours).toFixed(1)}h</td>
                  <td className="text-right py-3 px-4">{fmt(Math.max(0, totalHours - overtimeHours) * 250)}</td>
                </tr>
                {overtimeHours > 0 && (
                  <tr>
                    <td className="py-3 px-4">Overtime Pay (1.5x)</td>
                    <td className="text-right py-3 px-4 text-gray-500">{overtimeHours.toFixed(1)}h</td>
                    <td className="text-right py-3 px-4">{fmt(overtimeHours * 250 * 1.5)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50/50">
                  <td className="py-3 px-4 font-medium">Gross Earnings</td>
                  <td className="text-right py-3 px-4"></td>
                  <td className="text-right py-3 px-4 font-bold">{fmt(gross)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-red-600">Standard Tax Deduction (24%)</td>
                  <td className="text-right py-3 px-4 text-gray-500"></td>
                  <td className="text-right py-3 px-4 text-red-600">-{fmt(deductions)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-violet-600 text-white">
                <tr>
                  <td className="py-4 px-4 font-bold text-lg">Net Pay</td>
                  <td className="text-right py-4 px-4"></td>
                  <td className="text-right py-4 px-4 font-bold text-xl">{fmt(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="text-center text-xs text-gray-400 mt-12">
            <p>This is a computer generated document. No signature is required.</p>
          </div>
        </div>

        {/* Action buttons (hidden when printing) */}
        <div className="flex justify-end gap-2 p-6 pt-0 no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={handlePrint} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState('overview')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null)

  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: currentEntries, isLoading: tsLoading } = useTimesheetEntries(undefined, monthStart, monthEnd)
  const { data: attendance } = useAttendanceRange(monthStart, monthEnd)

  // 6-month trend
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i)
      return { month: format(d, 'MMM'), gross: 0, hours: 0 }
    })
  }, [])

  // Current month per-employee payroll
  const payrollRows = useMemo(() => {
    if (!employees) return []
    return employees
      .filter(e => e.status === 'active')
      .map(emp => {
        const empEntries = (currentEntries ?? []).filter(t => t.employee_id === emp.id)
        const totalHours = empEntries.reduce((s, t) => s + (t.total_hours ?? 0), 0)
        const overtimeHours = empEntries.reduce((s, t) => s + (t.overtime_hours ?? 0), 0)
        const gross = estimateGross(totalHours, overtimeHours)
        const deductions = gross * DEDUCTION_RATE
        const net = gross - deductions
        const approved = empEntries.filter(t => t.is_approved).length
        const status = empEntries.length === 0 ? 'no_data' : approved === empEntries.length ? 'ready' : 'pending'
        return { emp, totalHours, overtimeHours, gross, deductions, net, status, entries: empEntries.length }
      })
  }, [employees, currentEntries])

  const totals = useMemo(() => {
    const gross = payrollRows.reduce((s, r) => s + r.gross, 0)
    const net = payrollRows.reduce((s, r) => s + r.net, 0)
    const deductions = payrollRows.reduce((s, r) => s + r.deductions, 0)
    const paid = payrollRows.filter(r => r.status === 'ready').length
    return { gross, net, deductions, paid, total: payrollRows.length }
  }, [payrollRows])

  const isLoading = empLoading || tsLoading

  const handleRunPayroll = async () => {
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsProcessing(false)
    toast.success('Payroll run initiated', { description: `Processing ${totals.total} employees for ${format(today, 'MMMM yyyy')}` })
  }

  const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    ready: { label: 'Ready', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
    no_data: { label: 'No Data', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: AlertCircle },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            {format(today, 'MMMM yyyy')} · Estimated compensation based on timesheet hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={() => {
              if (payrollRows.length === 0) {
                toast.error('No payroll records to export')
                return
              }
              const exportData = payrollRows.map(row => ({
                Employee: `${row.emp.first_name} ${row.emp.last_name}`,
                Department: row.emp.departments?.name || 'N/A',
                'Total Hours': row.totalHours,
                'OT Hours': row.overtimeHours,
                Status: row.status,
                'Gross Pay': fmt(row.gross),
                'Net Pay': fmt(row.net)
              }))
              downloadCSV(exportData, `Payroll_Export_${format(today, 'MMM_yyyy')}`)
              toast.success('Payroll export downloaded successfully')
            }}
          >
            <Download className="size-4" />Export
          </Button>
          {can.managePayroll() && (
            <Button className="gap-1.5" onClick={handleRunPayroll} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Run Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Pending banner */}
      {!isLoading && payrollRows.some(r => r.status === 'pending') && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {format(today, 'MMMM yyyy')} payroll has pending timesheets
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                {payrollRows.filter(r => r.status === 'pending').length} employees awaiting timesheet approval
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            onClick={() => navigate('/app/timesheet')}
          >
            Review
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : [
          {
            label: `Gross (${format(today, 'MMM')})`,
            value: fmt(totals.gross),
            icon: DollarSign,
            change: '+0%',
            up: true,
            color: 'text-primary',
            bg: 'bg-primary/10',
            sub: 'estimated',
          },
          {
            label: 'Est. Net Disbursed',
            value: fmt(totals.net),
            icon: Wallet,
            change: '+0%',
            up: true,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-950/50',
            sub: `after ${(DEDUCTION_RATE * 100).toFixed(0)}% deductions`,
          },
          {
            label: 'Total Deductions',
            value: fmt(totals.deductions),
            icon: PieChart,
            change: '+0%',
            up: false,
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-950/50',
            sub: 'taxes + benefits',
          },
          {
            label: 'Employees',
            value: `${totals.paid}/${totals.total}`,
            icon: Users,
            change: `${totals.total - totals.paid} pending`,
            up: totals.paid === totals.total,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-950/50',
            sub: 'ready / total active',
          },
        ].map(s => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payslip Dialog */}
      <PayslipDialog 
        open={!!selectedPayslip} 
        onOpenChange={(op) => !op && setSelectedPayslip(null)} 
        data={selectedPayslip}
        period={`${format(today, 'MMMM yyyy')}`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="no-print">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hours Worked by Employee</CardTitle>
                <CardDescription>{format(today, 'MMMM yyyy')} — from approved timesheets</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : payrollRows.filter(r => r.totalHours > 0).length === 0 ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No timesheet data for this month yet
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
                    <BarChart
                      data={payrollRows.filter(r => r.totalHours > 0).slice(0, 10).map(r => ({
                        name: r.emp.first_name,
                        hours: parseFloat(r.totalHours.toFixed(1)),
                        gross: Math.round(r.gross),
                      }))}
                      margin={{ left: -10 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Deduction Estimate</CardTitle>
                  <CardDescription className="text-xs">Based on {(DEDUCTION_RATE * 100).toFixed(0)}% flat rate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: 'Federal Tax', pct: 18 },
                    { label: 'State Tax', pct: 5 },
                    { label: 'Health Insurance', pct: 4 },
                    { label: 'Retirement (401k)', pct: 3 },
                  ].map(d => (
                    <div key={d.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className="font-medium">
                          {fmt(totals.gross * (d.pct / 100))}
                        </span>
                      </div>
                      <Progress value={d.pct * 4} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                      <CreditCard className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Next payroll date</p>
                      <p className="font-semibold">{format(endOfMonth(today), 'MMMM d, yyyy')}</p>
                    </div>
                    <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{format(today, 'MMMM yyyy')} Employee Payroll</CardTitle>
              <CardDescription>Estimated compensation based on logged timesheet hours</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Hours</TableHead>
                      <TableHead className="text-right">Est. Gross</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Deductions</TableHead>
                      <TableHead className="text-right w-[120px]">Net Pay</TableHead>
                      <TableHead className="text-center w-[120px]">Status</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                          No active employees found
                        </TableCell>
                      </TableRow>
                    ) : payrollRows.map((r) => {
                      const { emp, totalHours, overtimeHours, gross, deductions, net, status } = r
                      const cfg = STATUS_CONFIG[status]
                      const Icon = cfg.icon
                      return (
                        <TableRow 
                          key={emp.id} 
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedPayslip(r)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                  {`${emp.first_name[0]}${emp.last_name[0] ?? ''}`}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{emp.departments?.name ?? '—'}</span>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm">{totalHours.toFixed(1)}h</span>
                            {overtimeHours > 0 && (
                              <span className="ml-1 text-xs text-amber-600">+{overtimeHours.toFixed(1)}OT</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-medium">{gross > 0 ? fmt(gross) : '—'}</span>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">
                            <span className="text-sm text-red-600 dark:text-red-400">
                              {gross > 0 ? `-${fmt(deductions)}` : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-semibold text-emerald-600">{net > 0 ? fmt(net) : '—'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-xs gap-1 ${cfg.className}`}>
                              <Icon className="size-2.5" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
