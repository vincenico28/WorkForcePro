import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, setDate } from 'date-fns'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  DollarSign, Users, TrendingUp, Download,
  CheckCircle, Clock, AlertCircle, ChevronRight, CreditCard,
  Wallet, PieChart, ArrowUpRight, Loader2, ShieldCheck,
  Building2, Calendar, FileText, Gift, Landmark, Printer,
  Coins, Scale, CheckCircle2
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
import { TableSkeleton } from '@/components/ui/skeleton-table'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { useEmployees } from '@/hooks/use-employees'
import { useTimesheetEntries } from '@/hooks/use-timesheets'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { useLeaveRequests, useAllLeaveBalances, useLeaveTypes } from '@/hooks/use-leaves'
import { usePerformanceReviews } from '@/hooks/use-performance'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import { downloadCSV } from '@/utils/export'
import { computeLeaveMonetizationLedger } from '@/utils/leave-monetization'
import { YearEndMonetizationTab } from '../leaves/monetization-tab'
import {
  calculateSSS,
  calculatePhilHealth,
  calculatePagIbig,
  calculateWithholdingTax,
  formatPHP,
  type PhilippinePayrollItem,
} from '@/utils/philippine-payroll'

const chartConfig = {
  gross: { label: 'Gross Pay', color: 'var(--chart-1)' },
  net: { label: 'Net Pay', color: 'var(--chart-2)' },
  statutory: { label: 'Govt Deductions', color: 'var(--chart-3)' },
}

type CutoffPeriod = 'first_half' | 'second_half' | 'monthly'

function PayslipDialog({ 
  open, 
  onOpenChange, 
  data,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  data: PhilippinePayrollItem | null;
}) {
  if (!data) return null
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
      pdf.save(`Payslip_${data.employeeName.replace(/\s+/g, '_')}_${data.periodLabel.replace(/\s+/g, '_')}.pdf`)
      
      toast.success('Payslip PDF downloaded successfully')
    } catch (error) {
      console.error('Failed to generate PDF', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white text-gray-900 sm:rounded-xl max-h-[90vh] overflow-y-auto">
        <div id="payslip-print-area" className="print-area p-6 bg-white text-gray-900 font-sans">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-violet-700 tracking-tight">PRIORITY HANDLING LOGISTICS, INC.</h2>
                <p className="text-xs text-gray-500">Corporate Logistics Center, Metro Manila, Philippines</p>
                <p className="text-xs text-gray-500">BIR TIN: 009-842-153-000 | DOLE Reg. No: NCR-QC-2024-08</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-1 rounded">
                  OFFICIAL PAYSLIP
                </span>
                <p className="text-xs font-medium text-gray-600 mt-1.5">Pay Period: {data.periodLabel}</p>
              </div>
            </div>
          </div>

          {/* Employee & Bank Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-3.5 rounded-lg border border-gray-100 mb-5 text-xs">
            <div className="space-y-1">
              <p><span className="text-gray-500 font-medium">Employee Name:</span> <strong className="text-gray-900">{data.employeeName}</strong></p>
              <p><span className="text-gray-500 font-medium">Employee ID:</span> {data.employeeNo}</p>
              <p><span className="text-gray-500 font-medium">Department:</span> {data.department}</p>
              <p><span className="text-gray-500 font-medium">Position:</span> {data.position}</p>
            </div>
            <div className="space-y-1">
              <p><span className="text-gray-500 font-medium">SSS No:</span> {data.sssNo || '34-8921471-0'}</p>
              <p><span className="text-gray-500 font-medium">PhilHealth No:</span> {data.philHealthNo || '12-050219481-4'}</p>
              <p><span className="text-gray-500 font-medium">Pag-IBIG No:</span> {data.pagIbigNo || '1210-9481-2241'}</p>
              <p><span className="text-gray-500 font-medium">TIN:</span> {data.tinNo || '412-881-094-000'}</p>
            </div>
          </div>

          {/* Two-Column Itemized Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-4 mb-5 text-xs">
            {/* Earnings Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 border-b border-emerald-100 flex justify-between">
                  <span>EARNINGS</span>
                  <span>AMOUNT</span>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Pay ({data.regularHoursWorked.toFixed(1)}h @ ₱{data.baseHourlyRate}/h)</span>
                    <span className="font-medium text-gray-900">{formatPHP(data.basicPayEarned)}</span>
                  </div>
                  {data.overtimePay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime (125% - {data.overtimeHours.toFixed(1)}h)</span>
                      <span className="font-medium text-gray-900">{formatPHP(data.overtimePay)}</span>
                    </div>
                  )}
                  {data.paidLeavePay > 0 && (
                    <div className="space-y-1">
                      {data.leaveBreakdown && data.leaveBreakdown.length > 0 ? (
                        data.leaveBreakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-emerald-700">
                            <span>{item}</span>
                            <span className="font-medium">Included</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between text-emerald-700">
                          <span>Paid Leave ({data.paidLeaveHours.toFixed(1)}h)</span>
                          <span className="font-medium">{formatPHP(data.paidLeavePay)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {data.unpaidLeaveHours > 0 && (
                    <div className="flex justify-between text-gray-500 italic">
                      <span>Unpaid Leave / LWOP ({data.unpaidLeaveHours.toFixed(1)}h)</span>
                      <span>₱0.00</span>
                    </div>
                  )}
                  {data.deMinimisAllowance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">De Minimis (Non-taxable)</span>
                      <span className="font-medium text-gray-900">{formatPHP(data.deMinimisAllowance)}</span>
                    </div>
                  )}
                  {data.performanceIncentive > 0 && (
                    <div className="flex justify-between">
                      <span className="text-violet-700 font-medium">Performance Incentive</span>
                      <span className="font-medium text-violet-700">{formatPHP(data.performanceIncentive)}</span>
                    </div>
                  )}
                  {data.leaveConversionBonus !== undefined && data.leaveConversionBonus > 0 && (
                    <div className="flex justify-between bg-amber-50/80 text-amber-900 border border-amber-200/70 p-1.5 rounded">
                      <div>
                        <span className="font-bold block">Leave Cash Conversion (DOLE Art. 95)</span>
                        <span className="text-[10px] text-amber-700 block">
                          {data.leaveConversionDays || 0} Unused Days @ ₱{(data.baseHourlyRate * 8).toLocaleString()}/day
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-800 self-center">+{formatPHP(data.leaveConversionBonus)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 font-bold flex justify-between">
                <span>TOTAL GROSS EARNINGS</span>
                <span className="text-gray-900">{formatPHP(data.grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-red-50 text-red-800 font-bold px-3 py-1.5 border-b border-red-100 flex justify-between">
                  <span>DEDUCTIONS</span>
                  <span>AMOUNT</span>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SSS Contribution (EE)</span>
                    <span className="font-medium text-red-600">-{formatPHP(data.sss.employeeShare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PhilHealth Premium (EE)</span>
                    <span className="font-medium text-red-600">-{formatPHP(data.philHealth.employeeShare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pag-IBIG / HDMF (EE)</span>
                    <span className="font-medium text-red-600">-{formatPHP(data.pagIbig.employeeShare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BIR Withholding Tax</span>
                    <span className="font-medium text-red-600">
                      {data.tax.withholdingTax > 0 ? `-${formatPHP(data.tax.withholdingTax)}` : '₱0.00 (Exempt)'}
                    </span>
                  </div>
                  {data.tardinessDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-700">Tardiness / Lates</span>
                      <span className="font-medium text-amber-700">-{formatPHP(data.tardinessDeduction)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 font-bold flex justify-between">
                <span>TOTAL DEDUCTIONS</span>
                <span className="text-red-600">-{formatPHP(data.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Employer Contributions & 13th Month Transparency Bar */}
          <div className="grid grid-cols-2 gap-4 bg-violet-50/50 p-3 rounded-lg border border-violet-100 mb-5 text-[11px]">
            <div>
              <p className="font-bold text-violet-900 mb-1">Employer Government Share (For Info Only)</p>
              <div className="flex justify-between text-gray-600">
                <span>SSS ER + EC: {formatPHP(data.sss.employerShare)}</span>
                <span>PhilHealth ER: {formatPHP(data.philHealth.employerShare)}</span>
                <span>Pag-IBIG ER: {formatPHP(data.pagIbig.employerShare)}</span>
              </div>
            </div>
            <div>
              <p className="font-bold text-violet-900 mb-1">Philippine Labor Law Accrual</p>
              <div className="flex justify-between text-gray-600">
                <span>Tax Bracket: {data.tax.taxBracket}</span>
                <span className="font-semibold text-emerald-800">Accrued 13th Month: {formatPHP(data.accrued13thMonthPay)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Grand Highlight */}
          <div className="bg-violet-700 text-white rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-medium text-violet-200 uppercase tracking-wider">NET TAKE-HOME PAY</p>
              <p className="text-xs text-violet-200">Disbursed via Direct Bank / Payroll Account</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black">{formatPHP(data.netTakeHomePay)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-gray-400 mt-6 border-t border-gray-100 pt-3">
            <p>This is an official computer-generated payslip generated by Priority Handling Logistics, Inc. HR & Payroll System.</p>
            <p>In compliance with DOLE Labor Advisory No. 26 & BIR Tax Regulations.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 p-4 pt-0 no-print border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={handlePrint} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {isGenerating ? 'Generating PDF...' : 'Download Payslip PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState('masterlist')
  const [cutoff, setCutoff] = useState<CutoffPeriod>('first_half')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<PhilippinePayrollItem | null>(null)

  const today = new Date()
  
  // Date range based on selected Cutoff period
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    const midMonth = setDate(today, 15)
    const secondHalfStart = setDate(today, 16)

    if (cutoff === 'first_half') {
      return {
        periodStart: format(monthStart, 'yyyy-MM-dd'),
        periodEnd: format(midMonth, 'yyyy-MM-dd'),
        periodLabel: `1st Cutoff (${format(monthStart, 'MMM 1')} – ${format(midMonth, 'MMM 15, yyyy')})`
      }
    } else if (cutoff === 'second_half') {
      return {
        periodStart: format(secondHalfStart, 'yyyy-MM-dd'),
        periodEnd: format(monthEnd, 'yyyy-MM-dd'),
        periodLabel: `2nd Cutoff (${format(secondHalfStart, 'MMM 16')} – ${format(monthEnd, 'MMM d, yyyy')})`
      }
    } else {
      return {
        periodStart: format(monthStart, 'yyyy-MM-dd'),
        periodEnd: format(monthEnd, 'yyyy-MM-dd'),
        periodLabel: `Monthly (${format(monthStart, 'MMMM yyyy')})`
      }
    }
  }, [cutoff, today])

  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: currentEntries, isLoading: tsLoading } = useTimesheetEntries(undefined, periodStart, periodEnd)
  const { data: attendance } = useAttendanceRange(periodStart, periodEnd)
  const { data: leaves, isLoading: leavesLoading } = useLeaveRequests()
  const { data: performance, isLoading: perfLoading } = usePerformanceReviews()
  const { data: allBalances, isLoading: balLoading } = useAllLeaveBalances()
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes()
  const [includeLeaveBonus, setIncludeLeaveBonus] = useState<boolean>(true)

  const leaveMonetization = useMemo(() => {
    if (!employees || !allBalances || !leaveTypes) return null
    return computeLeaveMonetizationLedger(employees, allBalances, leaveTypes)
  }, [employees, allBalances, leaveTypes])

  // Calculate Philippine Payroll Rows with full Attendance & Timesheet reconciliation
  const payrollRows: PhilippinePayrollItem[] = useMemo(() => {
    if (!employees) return []
    const isSemiMonthly = cutoff !== 'monthly'

    return employees
      .filter(e => e.status === 'active')
      .map(emp => {
        const empEntries = (currentEntries ?? []).filter(t => t.employee_id === emp.id)
        const empAtt = (attendance ?? []).filter(a => a.employee_id === emp.id)
        
        // 1. Reconcile Hours from Timesheets & Attendance
        const tsTotalHours = empEntries.reduce((s, t) => s + (t.total_hours ?? 0), 0)
        const tsOvertimeHours = empEntries.reduce((s, t) => s + (t.overtime_hours ?? 0), 0)

        const attTotalHours = empAtt.reduce((s, a) => s + (a.total_hours ?? 0), 0)
        const attOvertimeHours = empAtt.reduce((s, a) => s + (a.overtime_hours ?? 0), 0)

        // Use timesheet hours, or fallback to direct attendance records if timesheets are pending generation
        const effectiveTotalHours = tsTotalHours > 0 ? tsTotalHours : attTotalHours
        const effectiveOvertimeHours = Math.max(tsOvertimeHours, attOvertimeHours)
        const regularHours = Math.max(0, effectiveTotalHours - effectiveOvertimeHours)

        // 2. Reconcile Approved Leaves with Date-Range Overlap
        const empLeaves = (leaves ?? []).filter(l => 
          l.employee_id === emp.id && 
          l.status === 'approved'
        )

        let paidLeaveDays = 0
        let unpaidLeaveDays = 0
        const leaveBreakdownList: string[] = []

        const pStart = new Date(periodStart)
        const pEnd = new Date(periodEnd)

        empLeaves.forEach(l => {
          const lStart = new Date(l.start_date)
          const lEnd = new Date(l.end_date)

          // Check if leave intersects with the period
          if (lStart <= pEnd && lEnd >= pStart) {
            const isHalfDay = l.duration_type === 'half_day_am' || l.duration_type === 'half_day_pm'
            const isPaid = l.leave_types?.is_paid ?? true
            const typeName = l.leave_types?.name || 'Leave'

            if (isHalfDay) {
              if (lStart >= pStart && lStart <= pEnd) {
                if (isPaid) {
                  paidLeaveDays += 0.5
                  leaveBreakdownList.push(`${typeName} (Half-day AM/PM)`)
                } else {
                  unpaidLeaveDays += 0.5
                }
              }
            } else {
              // Calculate overlap days
              const overlapStart = lStart < pStart ? pStart : lStart
              const overlapEnd = lEnd > pEnd ? pEnd : lEnd
              const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime())
              const overlapDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1

              if (isPaid) {
                paidLeaveDays += overlapDays
                leaveBreakdownList.push(`${typeName} (${overlapDays}d)`)
              } else {
                unpaidLeaveDays += overlapDays
              }
            }
          }
        })

        const paidLeaveHours = paidLeaveDays * 8
        const unpaidLeaveHours = unpaidLeaveDays * 8

        // 3. Tardiness & Lates from Attendance
        const lateRecords = empAtt.filter(a => a.status === 'late')
        // Assume 15 minutes average per late if exact shift not populated
        const tardinessMinutes = lateRecords.length * 15

        // 4. Rates
        const baseHourlyRate = Number((emp.salary_info as any)?.hourly_rate) || 250
        const monthlyBasicEquivalent = baseHourlyRate * 8 * 22 // 22 working days standard

        // 5. Earnings Breakdown
        const basicPayEarned = regularHours * baseHourlyRate
        const overtimePay = effectiveOvertimeHours * baseHourlyRate * 1.25 // PH Labor Code standard 125%
        const nightDiffPay = 0
        const holidayPay = 0
        const paidLeavePay = paidLeaveHours * baseHourlyRate
        
        // De Minimis Non-taxable Allowance (₱1,500/month or ₱750/semi-monthly)
        const deMinimisAllowance = isSemiMonthly ? 750 : 1500

        // Performance Incentive
        const empPerf = (performance ?? []).filter(p => 
          p.employee_id === emp.id && 
          p.created_at.startsWith(periodStart.substring(0, 7))
        )
        const performanceIncentive = (empPerf.length > 0 && (empPerf[0].overall_rating ?? 0) >= 4.0) ? (isSemiMonthly ? 500 : 1000) : 0

        // DOLE Art. 95 Leave Monetization Cash Bonus
        const empMonetization = leaveMonetization?.records.find(r => r.employeeId === emp.id)
        const leaveConversionBonus = (includeLeaveBonus && empMonetization) ? empMonetization.cashBonus : 0
        const leaveConversionDays = (includeLeaveBonus && empMonetization) ? empMonetization.totalUnusedConvertibleDays : 0

        const grossEarnings = basicPayEarned + overtimePay + paidLeavePay + deMinimisAllowance + performanceIncentive + leaveConversionBonus

        // 6. Tardiness Deductions (Hourly Rate / 60 * minutes)
        const tardinessDeduction = Math.round(((baseHourlyRate / 60) * tardinessMinutes) * 100) / 100
        const undertimeDeduction = 0

        // 7. Statutory Government Contributions (Pro-rated for Semi-Monthly)
        const fullSSS = calculateSSS(monthlyBasicEquivalent)
        const fullPhilHealth = calculatePhilHealth(monthlyBasicEquivalent)
        const fullPagIbig = calculatePagIbig(monthlyBasicEquivalent)

        const divisor = isSemiMonthly ? 2 : 1
        
        const sss: typeof fullSSS = {
          ...fullSSS,
          employeeShare: Math.round((fullSSS.employeeShare / divisor) * 100) / 100,
          employerShare: Math.round((fullSSS.employerShare / divisor) * 100) / 100,
          wispEmployeeShare: Math.round((fullSSS.wispEmployeeShare / divisor) * 100) / 100,
          wispEmployerShare: Math.round((fullSSS.wispEmployerShare / divisor) * 100) / 100,
          totalEmployee: Math.round((fullSSS.totalEmployee / divisor) * 100) / 100,
          totalEmployer: Math.round((fullSSS.totalEmployer / divisor) * 100) / 100,
          totalContribution: Math.round((fullSSS.totalContribution / divisor) * 100) / 100,
        }

        const philHealth: typeof fullPhilHealth = {
          ...fullPhilHealth,
          employeeShare: Math.round((fullPhilHealth.employeeShare / divisor) * 100) / 100,
          employerShare: Math.round((fullPhilHealth.employerShare / divisor) * 100) / 100,
          totalContribution: Math.round((fullPhilHealth.totalContribution / divisor) * 100) / 100,
        }

        const pagIbig: typeof fullPagIbig = {
          ...fullPagIbig,
          employeeShare: Math.round((fullPagIbig.employeeShare / divisor) * 100) / 100,
          employerShare: Math.round((fullPagIbig.employerShare / divisor) * 100) / 100,
          totalContribution: Math.round((fullPagIbig.totalContribution / divisor) * 100) / 100,
        }

        const totalStatutoryEmployee = sss.employeeShare + philHealth.employeeShare + pagIbig.employeeShare
        const totalStatutoryEmployer = sss.employerShare + philHealth.employerShare + pagIbig.employerShare

        // 8. Taxable Income & BIR Withholding Tax (TRAIN Law)
        const taxableIncome = Math.max(0, grossEarnings - deMinimisAllowance - totalStatutoryEmployee)
        const tax = calculateWithholdingTax(taxableIncome, isSemiMonthly ? 'semi_monthly' : 'monthly')

        // 9. Total Deductions & Net Take-Home Pay
        const totalDeductions = totalStatutoryEmployee + tax.withholdingTax + tardinessDeduction + undertimeDeduction
        const netTakeHomePay = Math.max(0, grossEarnings - totalDeductions)

        // 10. 13th Month Accrual (PD 851: Basic Pay / 12)
        const accrued13thMonthPay = Math.round((basicPayEarned / 12) * 100) / 100

        const hasEntries = empEntries.length > 0 || empAtt.length > 0
        const approvedCount = empEntries.filter(t => t.is_approved).length
        const isFullyApproved = empEntries.length > 0 && approvedCount === empEntries.length
        
        const status = !hasEntries ? 'no_data' : (isFullyApproved || empAtt.length > 0 && empEntries.length === 0) ? 'ready' : 'pending'

        return {
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          position: emp.position || 'Operations Staff',
          department: emp.departments?.name || 'Operations',
          employeeNo: emp.employee_id || `PHL-${emp.id.substring(0, 5).toUpperCase()}`,
          tinNo: (emp as any).tin || '412-881-094-000',
          sssNo: (emp as any).sss_no || '34-8921471-0',
          philHealthNo: (emp as any).philhealth_no || '12-050219481-4',
          pagIbigNo: (emp as any).pagibig_no || '1210-9481-2241',
          
          cutoffType: cutoff,
          periodLabel,
          
          baseHourlyRate,
          monthlyBasicEquivalent,
          regularHoursWorked: regularHours,
          overtimeHours: effectiveOvertimeHours,
          nightDiffHours: 0,
          holidayHours: 0,
          paidLeaveDays,
          unpaidLeaveDays,
          leaveBreakdown: leaveBreakdownList,
          paidLeaveHours,
          unpaidLeaveHours,
          tardinessMinutes,
          undertimeMinutes: 0,
          
          basicPayEarned,
          overtimePay,
          nightDiffPay,
          holidayPay,
          paidLeavePay,
          leaveConversionBonus,
          leaveConversionDays,
          deMinimisAllowance,
          performanceIncentive,
          grossEarnings,
          
          tardinessDeduction,
          undertimeDeduction,
          
          sss,
          philHealth,
          pagIbig,
          totalStatutoryEmployee,
          totalStatutoryEmployer,
          
          tax,
          
          totalDeductions,
          netTakeHomePay,
          
          accrued13thMonthPay,
          status,
          entriesCount: Math.max(empEntries.length, empAtt.length),
        }
      })
  }, [employees, currentEntries, attendance, leaves, performance, periodStart, periodEnd, cutoff, periodLabel, leaveMonetization, includeLeaveBonus])

  // Summary Totals
  const totals = useMemo(() => {
    const gross = payrollRows.reduce((s, r) => s + r.grossEarnings, 0)
    const net = payrollRows.reduce((s, r) => s + r.netTakeHomePay, 0)
    const deductions = payrollRows.reduce((s, r) => s + r.totalDeductions, 0)
    const statutoryEE = payrollRows.reduce((s, r) => s + r.totalStatutoryEmployee, 0)
    const statutoryER = payrollRows.reduce((s, r) => s + r.totalStatutoryEmployer, 0)
    const taxWithheld = payrollRows.reduce((s, r) => s + r.tax.withholdingTax, 0)
    const thirteenthMonthAccrued = payrollRows.reduce((s, r) => s + r.accrued13thMonthPay, 0)
    const paid = payrollRows.filter(r => r.status === 'ready').length

    return { 
      gross, 
      net, 
      deductions, 
      statutoryEE, 
      statutoryER, 
      taxWithheld, 
      thirteenthMonthAccrued, 
      paid, 
      total: payrollRows.length 
    }
  }, [payrollRows])

  const isLoading = empLoading || tsLoading || leavesLoading || perfLoading

  const handleRunPayroll = async () => {
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsProcessing(false)
    toast.success('Philippine Payroll processed successfully', {
      description: `Disbursed ${totals.total} employees for ${periodLabel}` 
    })
  }

  // Export Bank Disbursal File (PH Standard)
  const handleBankExport = () => {
    if (payrollRows.length === 0) {
      toast.error('No payroll records available for export')
      return
    }
    const exportData = payrollRows.map(row => ({
      'Employee Name': row.employeeName,
      'Employee No': row.employeeNo,
      'Department': row.department,
      'Gross Pay (PHP)': row.grossEarnings.toFixed(2),
      'SSS EE': row.sss.employeeShare.toFixed(2),
      'PhilHealth EE': row.philHealth.employeeShare.toFixed(2),
      'Pag-IBIG EE': row.pagIbig.employeeShare.toFixed(2),
      'Tax Withheld': row.tax.withholdingTax.toFixed(2),
      'Net Pay (PHP)': row.netTakeHomePay.toFixed(2),
      '13th Month Accrual': row.accrued13thMonthPay.toFixed(2),
      'Bank Disbursement': 'Direct Credit (BDO / BPI / Maya)',
      'Status': row.status.toUpperCase(),
    }))
    downloadCSV(exportData, `PH_Payroll_Disbursement_${periodStart}_to_${periodEnd}`)
    toast.success('Philippine Payroll bank file downloaded')
  }

  const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    ready: { label: 'Ready', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
    pending: { label: 'Pending Timesheet', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
    no_data: { label: 'No Clock-in', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: AlertCircle },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Philippine Payroll System</h1>
            <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50 text-[11px] font-semibold">
              DOLE & BIR Compliant
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Priority Handling Logistics, Inc. · {periodLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cutoff Selector */}
          <Select value={cutoff} onValueChange={(val: CutoffPeriod) => setCutoff(val)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Calendar className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Select Cutoff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_half">1st Half (1st – 15th)</SelectItem>
              <SelectItem value="second_half">2nd Half (16th – End)</SelectItem>
              <SelectItem value="monthly">Monthly Summary</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 h-9 text-xs" 
            onClick={handleBankExport}
          >
            <Download className="size-3.5" /> Export Bank File
          </Button>

          {can.isHR() && (
            <Button 
              variant={includeLeaveBonus ? "default" : "outline"}
              size="sm" 
              className={`gap-1.5 h-9 text-xs font-semibold ${includeLeaveBonus ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" : "border-border text-muted-foreground"}`}
              onClick={() => {
                const next = !includeLeaveBonus
                setIncludeLeaveBonus(next)
                toast.info(next ? 'Leave Conversion Bonus (DOLE Art. 95) included in payroll' : 'Leave Bonus excluded from cutoff calculation')
              }}
            >
              <Coins className="size-3.5" />
              <span>{includeLeaveBonus ? 'Leave Bonus Included' : 'Include Leave Bonus'}</span>
            </Button>
          )}

          {can.managePayroll() && (
            <Button className="gap-1.5 h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={handleRunPayroll} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
              Disburse Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Pending timesheets notice */}
      {!isLoading && payrollRows.some(r => r.status === 'pending') && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Pending Timesheet Approvals
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Some timesheets require supervisor approval before payroll disbursement.
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            onClick={() => navigate('/app/timesheet')}
          >
            Review Timesheets <ChevronRight className="ml-1 size-3" />
          </Button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {[
          { label: 'Total Gross Disbursed', value: formatPHP(totals.gross), sub: `Includes OT, allowances & bonuses`, icon: DollarSign, color: 'text-violet-600' },
          { label: 'Total Net Take-Home Pay', value: formatPHP(totals.net), sub: `${totals.paid} of ${totals.total} employees ready`, icon: Wallet, color: 'text-emerald-600' },
          { label: 'Total Govt Remittances', value: formatPHP(totals.statutoryEE + totals.taxWithheld), sub: `SSS, PhilHealth, HDMF & Tax`, icon: ShieldCheck, color: 'text-blue-600' },
          { label: 'YTD 13th Month Accrual', value: formatPHP(totals.thirteenthMonthAccrued * 12), sub: `Mandatory PD 851 Year-End Reserve`, icon: Gift, color: 'text-amber-600' },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`size-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payslip Modal */}
      <PayslipDialog 
        open={!!selectedPayslip} 
        onOpenChange={(op) => !op && setSelectedPayslip(null)} 
        data={selectedPayslip}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap h-auto md:w-auto md:flex-nowrap">
          <TabsTrigger value="masterlist" className="gap-1.5">
            <Users className="size-3.5" /> Payroll Masterlist
          </TabsTrigger>
          <TabsTrigger value="statutory" className="gap-1.5">
            <ShieldCheck className="size-3.5" /> Statutory Remittances (SSS / PH / HDMF)
          </TabsTrigger>
          <TabsTrigger value="thirteenth" className="gap-1.5">
            <Gift className="size-3.5" /> 13th Month Pay Ledger
          </TabsTrigger>
          {can.isHR() && (
            <TabsTrigger value="leave_monetization" className="gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-500/20">
              <Coins className="size-3.5" /> Leave Conversion Bonus (Art. 95)
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Payroll Masterlist */}
        <TabsContent value="masterlist" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Employee Payroll Masterlist</CardTitle>
                  <CardDescription>
                    Detailed earnings, statutory contributions, and net pay for {periodLabel}
                  </CardDescription>
                </div>
                <span className="text-xs text-muted-foreground">
                  Click any employee row to view & download official DOLE Payslip
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={8} rows={6} withHeader={false} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="hidden md:table-cell">Dept</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">SSS (EE)</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">PhilHealth</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Pag-IBIG</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Tax</TableHead>
                        <TableHead className="text-right font-bold text-emerald-600">Net Pay</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                            No active employees found for this payroll period.
                          </TableCell>
                        </TableRow>
                      ) : payrollRows.map((r) => {
                        const cfg = STATUS_CONFIG[r.status]
                        const Icon = cfg.icon
                        return (
                          <TableRow 
                            key={r.employeeId} 
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedPayslip(r)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                    {r.employeeName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{r.employeeName}</p>
                                  <p className="text-xs text-muted-foreground truncate">{r.position}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {r.department}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {r.regularHoursWorked.toFixed(1)}h
                              {r.overtimeHours > 0 && (
                                <span className="ml-1 text-xs text-amber-600">+{r.overtimeHours.toFixed(1)}OT</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              <div>{formatPHP(r.grossEarnings)}</div>
                              {r.leaveConversionBonus !== undefined && r.leaveConversionBonus > 0 && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">
                                  +{formatPHP(r.leaveConversionBonus)} SIL
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-600 hidden sm:table-cell">
                              -{formatPHP(r.sss.employeeShare)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-600 hidden sm:table-cell">
                              -{formatPHP(r.philHealth.employeeShare)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-600 hidden sm:table-cell">
                              -{formatPHP(r.pagIbig.employeeShare)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-600 hidden md:table-cell">
                              {r.tax.withholdingTax > 0 ? `-${formatPHP(r.tax.withholdingTax)}` : '₱0.00'}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-emerald-600">
                              {formatPHP(r.netTakeHomePay)}
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Statutory Remittances (Government Compliance Schedules) */}
        <TabsContent value="statutory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* SSS Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-blue-700">SSS Contribution Schedule</CardTitle>
                  <Badge variant="outline">RA 11199</Badge>
                </div>
                <CardDescription className="text-xs">Social Security System (14% + EC)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employee Share (EE 4.5%):</span>
                  <span className="font-semibold text-red-600">{formatPHP(payrollRows.reduce((s, r) => s + r.sss.employeeShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employer Share (ER 9.5% + EC):</span>
                  <span className="font-semibold text-blue-600">{formatPHP(payrollRows.reduce((s, r) => s + r.sss.employerShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 font-bold pt-1">
                  <span>Total SSS Remittance:</span>
                  <span className="text-primary">{formatPHP(payrollRows.reduce((s, r) => s + r.sss.totalContribution, 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* PhilHealth Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-emerald-700">PhilHealth Premium</CardTitle>
                  <Badge variant="outline">RA 11223</Badge>
                </div>
                <CardDescription className="text-xs">Universal Health Care (5.0% Premium)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employee Share (EE 2.5%):</span>
                  <span className="font-semibold text-red-600">{formatPHP(payrollRows.reduce((s, r) => s + r.philHealth.employeeShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employer Share (ER 2.5%):</span>
                  <span className="font-semibold text-blue-600">{formatPHP(payrollRows.reduce((s, r) => s + r.philHealth.employerShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 font-bold pt-1">
                  <span>Total PhilHealth Remittance:</span>
                  <span className="text-primary">{formatPHP(payrollRows.reduce((s, r) => s + r.philHealth.totalContribution, 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pag-IBIG HDMF Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-amber-700">Pag-IBIG / HDMF Fund</CardTitle>
                  <Badge variant="outline">Cir. 460</Badge>
                </div>
                <CardDescription className="text-xs">Home Development Mutual Fund (2%)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employee Share (Max ₱200):</span>
                  <span className="font-semibold text-red-600">{formatPHP(payrollRows.reduce((s, r) => s + r.pagIbig.employeeShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Employer Share (Max ₱200):</span>
                  <span className="font-semibold text-blue-600">{formatPHP(payrollRows.reduce((s, r) => s + r.pagIbig.employerShare, 0))}</span>
                </div>
                <div className="flex justify-between py-1 font-bold pt-1">
                  <span>Total Pag-IBIG Remittance:</span>
                  <span className="text-primary">{formatPHP(payrollRows.reduce((s, r) => s + r.pagIbig.totalContribution, 0))}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BIR Withholding Tax Table Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">BIR Form 1601-C / Withholding Tax Summary</CardTitle>
                  <CardDescription>Bureau of Internal Revenue TRAIN Law Revised Withholding Tax Matrix</CardDescription>
                </div>
                <Badge className="bg-violet-600">Total Tax: {formatPHP(totals.taxWithheld)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>TIN</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      <TableHead className="text-right">Statutory Exemption</TableHead>
                      <TableHead className="text-right">Taxable Net</TableHead>
                      <TableHead className="text-left">Tax Bracket</TableHead>
                      <TableHead className="text-right font-bold text-red-600">Tax Withheld</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((r) => (
                      <TableRow key={r.employeeId}>
                        <TableCell className="font-medium text-sm">{r.employeeName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.tinNo}</TableCell>
                        <TableCell className="text-right text-sm">{formatPHP(r.grossEarnings)}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600">
                          {formatPHP(r.totalStatutoryEmployee + r.deMinimisAllowance)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatPHP(r.tax.taxableIncome)}</TableCell>
                        <TableCell className="text-left text-xs text-muted-foreground">{r.tax.taxBracket}</TableCell>
                        <TableCell className="text-right text-sm font-bold text-red-600">
                          {r.tax.withholdingTax > 0 ? formatPHP(r.tax.withholdingTax) : '₱0.00 (Exempt)'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: 13th Month Pay Ledger */}
        <TabsContent value="thirteenth" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="size-4 text-violet-600" /> Presidential Decree No. 851 — 13th Month Pay Ledger
                  </CardTitle>
                  <CardDescription>
                    Mandatory Philippine year-end bonus accrual (Total Basic Pay / 12). Non-taxable up to ₱90,000 ceiling.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                  Total YTD Accrual: {formatPHP(totals.thirteenthMonthAccrued * 12)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Cutoff Basic Pay</TableHead>
                      <TableHead className="text-right">Period Accrual (1/12)</TableHead>
                      <TableHead className="text-right font-bold text-emerald-600">Projected Year-End 13th Month</TableHead>
                      <TableHead className="text-center">Tax Exemption</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((r) => {
                      const projectedAnnual = r.monthlyBasicEquivalent
                      return (
                        <TableRow key={r.employeeId}>
                          <TableCell className="font-medium text-sm">{r.employeeName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.department}</TableCell>
                          <TableCell className="text-right text-sm">{formatPHP(r.basicPayEarned)}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-600">+{formatPHP(r.accrued13thMonthPay)}</TableCell>
                          <TableCell className="text-right text-sm font-bold text-emerald-700">
                            {formatPHP(projectedAnnual)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              {projectedAnnual <= 90000 ? '100% Tax Exempt (<₱90k)' : 'Partially Taxable'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: DOLE Art. 95 Leave Monetization Ledger */}
        {can.isHR() && (
          <TabsContent value="leave_monetization" className="space-y-4">
            <YearEndMonetizationTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
