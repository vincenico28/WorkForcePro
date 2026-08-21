import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Coins, Download, RefreshCw, CheckCircle2,
  Users, Building2, Search, Filter, AlertCircle, ArrowUpRight, Scale
} from 'lucide-react'
import { useEmployees } from '@/hooks/use-employees'
import { useAllLeaveBalances, useLeaveTypes } from '@/hooks/use-leaves'
import { usePermissions } from '@/hooks/use-permissions'
import {
  computeLeaveMonetizationLedger,
  pushMonetizationToPayroll,
  getStoredLeaveMonetization,
  saveLeaveMonetization,
  type LeaveMonetizationSummary
} from '@/utils/leave-monetization'
import { downloadCSV } from '@/utils/export'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export function YearEndMonetizationTab() {
  const { can } = usePermissions()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: allBalances, isLoading: balLoading, refetch: refetchBalances } = useAllLeaveBalances(selectedYear)
  const { data: leaveTypes, isLoading: typeLoading } = useLeaveTypes()

  // Compute or load stored summary
  const summary: LeaveMonetizationSummary = useMemo(() => {
    if (!employees || !allBalances || !leaveTypes) {
      return {
        year: selectedYear,
        totalEligibleEmployees: 0,
        totalUnusedDays: 0,
        totalCashBonusPayout: 0,
        isPushedToPayroll: false,
        records: [],
      }
    }
    return computeLeaveMonetizationLedger(employees, allBalances, leaveTypes, selectedYear)
  }, [employees, allBalances, leaveTypes, selectedYear])

  const [pushedStatus, setPushedStatus] = useState<boolean>(() => {
    const stored = getStoredLeaveMonetization(selectedYear)
    return stored?.isPushedToPayroll ?? false
  })

  // Filter records
  const filteredRecords = useMemo(() => {
    return summary.records.filter(r => {
      const matchesSearch = !searchQuery ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeNo.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDept = selectedDept === 'all' || r.department === selectedDept
      return matchesSearch && matchesDept
    })
  }, [summary.records, searchQuery, selectedDept])

  const departments = useMemo(() => {
    const set = new Set<string>()
    summary.records.forEach(r => {
      if (r.department) set.add(r.department)
    })
    return Array.from(set)
  }, [summary.records])

  const handlePushToPayroll = () => {
    if (summary.records.length === 0) {
      toast.error('No employee records available for leave conversion')
      return
    }

    const updated = pushMonetizationToPayroll(summary)
    setPushedStatus(true)
    toast.success('Converted to Cash Bonus & Pushed to Payroll!', {
      description: `₱${summary.totalCashBonusPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} credited across ${summary.totalEligibleEmployees} employees under DOLE Art. 95.`
    })
  }

  const handleExecuteYearEndReset = async () => {
    setIsResetting(true)
    try {
      // First ensure the monetization ledger is saved and pushed
      pushMonetizationToPayroll(summary)
      setPushedStatus(true)

      // Initialize the next calendar year balances for all employees
      const nextYear = selectedYear + 1
      const { error } = await supabase.rpc('initialize_yearly_leave_balances')
      if (error) throw error

      await refetchBalances()
      setIsResetDialogOpen(false)
      toast.success(`Annual Leave Reset Completed for Year ${nextYear}!`, {
        description: `Unused ${selectedYear} balances monetized to payroll, and fresh statutory allocations initialized for ${nextYear}.`
      })
    } catch (err: any) {
      toast.error('Failed to execute annual reset', { description: err.message })
    } finally {
      setIsResetting(false)
    }
  }

  const handleExportCSV = () => {
    if (summary.records.length === 0) {
      toast.error('No data to export')
      return
    }

    const exportData = summary.records.map(r => ({
      'Employee Name': r.employeeName,
      'Employee ID': r.employeeNo,
      'Department': r.department,
      'Position': r.position,
      'Daily Wage Rate (PHP)': r.dailyRate.toFixed(2),
      'Unused Vacation Leave (Days)': r.unusedVLDays,
      'Unused Sick Leave (Days)': r.unusedSLDays,
      'Total Monetized Days': r.totalUnusedConvertibleDays,
      'Cash Bonus (PHP)': r.cashBonus.toFixed(2),
      'Payroll Status': pushedStatus ? 'PUSHED_TO_PAYROLL' : 'READY_FOR_DISBURSEMENT',
      'Legal Basis': 'DOLE Labor Code Art. 95 (Service Incentive Leave)',
    }))

    downloadCSV(exportData, `DOLE_Leave_Cash_Monetization_Ledger_${selectedYear}`)
    toast.success('Monetization ledger CSV downloaded successfully')
  }

  const isLoading = empLoading || balLoading || typeLoading

  if (!can.isHR()) {
    return (
      <Card className="border-border/60 bg-muted/20 p-8 text-center">
        <Scale className="size-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-bold text-foreground">Management Access Required</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Under DOLE regulatory guidelines, Year-End Leave Cash Conversion, Monetization Ledgers, and Annual Reset operations are restricted to HR Managers, Admins, and Super Admins.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* DOLE Statutory Header Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shrink-0 border border-amber-500/30 shadow-xs">
                <Coins className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold">
                    Year-End Leave Cash Conversion & Annual Reset
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono">
                    DOLE Labor Code Art. 95
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Under Philippine DOLE regulations, all remaining unused Service Incentive Leaves (SIL), Vacation Leaves (VL), and Sick Leaves (SL) are commutable and convertible to cash bonuses based on the employee's daily wage rate prior to the annual calendar year reset.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleExportCSV}
              >
                <Download className="size-3.5" />
                Export Ledger
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-bold"
                onClick={handlePushToPayroll}
              >
                <CheckCircle2 className="size-3.5" />
                {pushedStatus ? 'Update in Payroll' : 'Convert & Push to Payroll'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs h-9 border border-border"
                onClick={() => setIsResetDialogOpen(true)}
              >
                <RefreshCw className="size-3.5" />
                Annual Reset
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Cash Payout */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total Cash Bonus Payout</span>
              <Coins className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              ₱{summary.totalCashBonusPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Monetized @ Daily Wage Rates
            </p>
          </CardContent>
        </Card>

        {/* Total Unused Days */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Unused Convertible Days</span>
              <Scale className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-black text-foreground">
              {summary.totalUnusedDays.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              From Vacation & Sick Leave Balances
            </p>
          </CardContent>
        </Card>

        {/* Eligible Employees */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Eligible Active Staff</span>
              <Users className="size-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-2xl font-black text-foreground">
              {summary.totalEligibleEmployees} <span className="text-xs font-normal text-muted-foreground">employees</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active workforce entitled to SIL bonus
            </p>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Payroll Sync Status</span>
              {pushedStatus ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <AlertCircle className="size-4 text-amber-500" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-sm font-bold mt-1">
              {pushedStatus ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
                  <CheckCircle2 className="size-3" />
                  Synced to Payroll
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs">
                  <AlertCircle className="size-3" />
                  Pending Conversion Push
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pushedStatus ? 'Disbursed in active payroll cutoff' : 'Click Convert & Push to Payroll'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Monetization Ledger Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">DOLE Leave Monetization Ledger ({selectedYear})</CardTitle>
              <CardDescription>
                Itemized breakdown of remaining convertible leave days and calculated cash bonuses per employee
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-[180px] h-8 pl-8 text-xs"
                />
              </div>

              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <Filter className="mr-1.5 size-3 text-muted-foreground" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Dept / Position</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead className="text-right">Unused VL</TableHead>
                    <TableHead className="text-right">Unused SL</TableHead>
                    <TableHead className="text-right font-semibold">Total Monetized</TableHead>
                    <TableHead className="text-right font-bold text-amber-600">Cash Bonus (PHP)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        No employee leave balances found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map(r => (
                      <TableRow key={r.employeeId} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {r.employeeName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate text-foreground">{r.employeeName}</p>
                              <p className="text-[11px] text-muted-foreground font-mono truncate">{r.employeeNo}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          <p className="font-medium text-foreground">{r.department}</p>
                          <p className="text-muted-foreground">{r.position}</p>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          ₱{r.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/d
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-mono">
                            {r.unusedVLDays}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 font-mono">
                            {r.unusedSLDays}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold font-mono">
                          {r.totalUnusedConvertibleDays} days
                        </TableCell>
                        <TableCell className="text-right text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                          ₱{r.cashBonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {pushedStatus ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              Pushed to Payroll
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                              Ready for Payroll
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annual Reset Confirmation Modal */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <RefreshCw className="size-4 text-amber-500" />
              Execute Annual Leave Reset ({selectedYear} → {selectedYear + 1})
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Confirming this action will finalize the {selectedYear} leave monetization ledger and initialize fresh DOLE statutory leave allowances for the new calendar year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
              <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Scale className="size-3.5" /> DOLE Labor Code Article 95 Process
              </p>
              <ul className="list-disc pl-4 space-y-1 text-amber-800 dark:text-amber-300 text-[11px]">
                <li>Total of <strong>₱{summary.totalCashBonusPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> converted to cash bonuses across {summary.totalEligibleEmployees} employees.</li>
                <li>All cash bonus records are permanently preserved and attached to the payroll system.</li>
                <li>All employee leave usage is cleared and reset to 0 used days with fresh statutory allocations.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={handleExecuteYearEndReset}
              disabled={isResetting}
            >
              {isResetting ? 'Processing Reset...' : `Confirm & Reset for Year ${selectedYear + 1}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
