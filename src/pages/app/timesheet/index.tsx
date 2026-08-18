import { useState, useMemo, useEffect } from 'react'
import {
  format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval,
  isToday, isWeekend, parseISO
} from 'date-fns'
import {
  Clock, CheckCircle, XCircle, Plus, ChevronLeft, ChevronRight,
  Download, TrendingUp, Timer, UserCheck, Edit2, Trash2, Wand2,
  RefreshCw, Filter, Sparkles, AlertCircle, ShieldAlert, CheckCheck,
  Search, ShieldCheck, FileCheck, Ban
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { useEmployees } from '@/hooks/use-employees'
import {
  useTimesheetEntries,
  useCreateTimesheetEntry,
  useUpdateTimesheetEntry,
  useDeleteTimesheetEntry,
  useApproveTimesheetEntry,
  useRejectTimesheetEntry,
  useBulkApproveTimesheetEntries,
  useBulkCreateTimesheetEntries,
  getWeekRange,
} from '@/hooks/use-timesheets'
import { useAttendanceRange } from '@/hooks/use-attendance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/skeleton-table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { downloadCSV } from '@/utils/export'
import type { TimesheetEntry } from '@/types'

const STATUS_CONFIG = {
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: XCircle },
}

function EditTimeEntryDialog({
  entry,
  onClose,
}: {
  entry: TimesheetEntry
  onClose: () => void
}) {
  const { mutateAsync, isPending } = useUpdateTimesheetEntry()
  const [form, setForm] = useState({
    date: entry.date,
    start_time: entry.start_time ?? '09:00',
    end_time: entry.end_time ?? '17:00',
    break_minutes: entry.break_minutes ?? 60,
    notes: entry.notes ?? '',
  })

  const calcHours = () => {
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    let totalMins = endMins - startMins
    if (totalMins < 0) totalMins += 24 * 60 // wrap around midnight
    const total = (totalMins - form.break_minutes) / 60
    return Math.max(0, total)
  }

  const hours = calcHours()
  const overtime = Math.max(0, hours - 8)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hours <= 0 && form.start_time === form.end_time) {
      toast.error('Start time and end time cannot be the same')
      return
    }
    try {
      await mutateAsync({
        id: entry.id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: form.break_minutes,
        total_hours: hours,
        overtime_hours: overtime,
        notes: form.notes || undefined,
      })
      toast.success('Timesheet entry updated successfully')
      onClose()
    } catch (err: any) {
      toast.error('Failed to update entry', { description: err.message })
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timesheet Entry</DialogTitle>
          <DialogDescription>Adjust clocked hours, break times, and notes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time *</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>End Time *</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Break (minutes)</Label>
            <Input type="number" value={form.break_minutes} onChange={e => setForm(p => ({ ...p, break_minutes: parseInt(e.target.value) || 0 }))} min={0} max={180} />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Regular Hours (max 8h)</span>
              <span className="font-semibold">{Math.min(8, hours).toFixed(1)}h</span>
            </div>
            {overtime > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 font-medium">Overtime (+25% DOLE)</span>
                <span className="font-bold text-amber-600">+{overtime.toFixed(1)}h</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-border/60 text-sm">
              <span className="font-medium">Total Paid Hours</span>
              <span className="font-bold">{hours.toFixed(1)}h</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes or adjustment justification..." rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddTimeEntryDialog({
  employeeId,
  date,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: {
  employeeId: string
  date?: Date
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess: () => void
}) {
  const { mutateAsync, isPending } = useCreateTimesheetEntry()
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen

  const [form, setForm] = useState({
    date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 60,
    notes: '',
    overtime_hours: 0,
  })

  useEffect(() => {
    if (date) {
      setForm(p => ({ ...p, date: format(date, 'yyyy-MM-dd') }))
    }
  }, [date])

  const calcHours = () => {
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    let totalMins = endMins - startMins
    if (totalMins < 0) totalMins += 24 * 60
    const total = (totalMins - form.break_minutes) / 60
    return Math.max(0, total)
  }

  const hours = calcHours()
  const overtime = Math.max(0, hours - 8)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hours <= 0 && form.start_time === form.end_time) {
      toast.error('Start time and end time cannot be the same')
      return
    }
    try {
      await mutateAsync({
        employee_id: employeeId,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: form.break_minutes,
        total_hours: hours,
        overtime_hours: overtime,
        source: 'manual',
        notes: form.notes || undefined,
      })
      toast.success('Time entry added')
      setOpen(false)
      onSuccess()
    } catch (err: any) {
      toast.error('Failed to add entry', { description: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Time Entry</DialogTitle>
          <DialogDescription>Record work hours for official payroll and timesheet tracking.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Break (minutes)</Label>
            <Input
              type="number"
              value={form.break_minutes}
              onChange={e => setForm(p => ({ ...p, break_minutes: parseInt(e.target.value) || 0 }))}
              min={0}
              max={180}
            />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Hours</span>
              <span className="font-semibold text-sm">{hours.toFixed(1)}h</span>
            </div>
            {overtime > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-600 font-medium">Overtime (+25%)</span>
                <span className="font-bold text-amber-600">+{overtime.toFixed(1)}h</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional description (e.g. Special project dispatch)..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  entry,
  onClose,
}: {
  entry: TimesheetEntry | null
  onClose: () => void
}) {
  const { mutateAsync: rejectEntry, isPending } = useRejectTimesheetEntry()
  const [reason, setReason] = useState('')

  if (!entry) return null

  const handleReject = async () => {
    try {
      await rejectEntry({ id: entry.id, notes: reason || 'Timesheet rejected by supervisor' })
      toast.success('Timesheet entry rejected')
      onClose()
    } catch (err: any) {
      toast.error('Failed to reject entry: ' + err.message)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
            <Ban className="size-5" /> Reject Time Entry
          </DialogTitle>
          <DialogDescription>
            Provide feedback for why this time log for {entry.employees ? `${entry.employees.first_name} ${entry.employees.last_name}` : 'Employee'} on {entry.date} is rejected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rejection Reason / Notes *</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Unverified overtime hours; please re-submit with supervisor sign-off."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TimesheetPage() {
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>(undefined)
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'overtime'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null)
  const [rejectingEntry, setRejectingEntry] = useState<TimesheetEntry | null>(null)
  const [addEntryOpen, setAddEntryOpen] = useState(false)
  const [addEntryDate, setAddEntryDate] = useState<Date | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('grid')

  const [aiAuditOpen, setAiAuditOpen] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<string | null>(null)

  const { startDate, endDate } = useMemo(() => ({
    startDate: format(currentWeekStart, 'yyyy-MM-dd'),
    endDate: format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }), [currentWeekStart])

  const { data: allEmployees } = useEmployees()
  const { data: entries, isLoading, refetch: refetchEntries } = useTimesheetEntries(selectedEmployee, startDate, endDate)
  const { data: attendanceRecords } = useAttendanceRange(startDate, endDate)

  const { mutateAsync: approveEntry } = useApproveTimesheetEntry()
  const { mutateAsync: bulkApprove } = useBulkApproveTimesheetEntries()
  const { mutateAsync: bulkCreate } = useBulkCreateTimesheetEntries()
  const { mutateAsync: deleteEntry } = useDeleteTimesheetEntry()

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>()
    allEmployees?.forEach(e => { if (e.departments?.name) set.add(e.departments.name) })
    return Array.from(set).sort()
  }, [allEmployees])

  const employees = useMemo(() => {
    if (!allEmployees) return []
    let list = can.isSupervisor() ? allEmployees : allEmployees.filter(e => e.id === employee?.id)
    if (selectedDepartment !== 'all') {
      list = list.filter(e => e.departments?.name === selectedDepartment)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e => 
        e.first_name.toLowerCase().includes(q) || 
        e.last_name?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allEmployees, can, employee?.id, selectedDepartment, searchQuery])

  const weekDays = useMemo(() => eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  }), [currentWeekStart])

  // Filtered entries based on tab/status
  const filteredEntries = useMemo(() => {
    if (!entries) return []
    let list = entries

    // Filter by department
    if (selectedDepartment !== 'all') {
      list = list.filter(e => e.employees?.departments?.name === selectedDepartment)
    }

    // Filter by status
    if (statusFilter === 'pending') {
      list = list.filter(e => !e.is_approved)
    } else if (statusFilter === 'approved') {
      list = list.filter(e => e.is_approved)
    } else if (statusFilter === 'overtime') {
      list = list.filter(e => (e.overtime_hours || 0) > 0)
    }

    return list
  }, [entries, selectedDepartment, statusFilter])

  // Summary KPI stats
  const stats = useMemo(() => {
    if (!entries) return { totalHours: 0, regularHours: 0, overtime: 0, pending: 0, approved: 0 }
    const totalHours = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0)
    const overtime = entries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0)
    return {
      totalHours,
      regularHours: Math.max(0, totalHours - overtime),
      overtime,
      pending: entries.filter(e => !e.is_approved).length,
      approved: entries.filter(e => e.is_approved).length,
    }
  }, [entries])

  // 1-Click Approve All Pending
  const handleApproveAllPending = async () => {
    if (!employee?.id) return
    const pendingIds = entries?.filter(e => !e.is_approved).map(e => e.id) || []
    if (pendingIds.length === 0) {
      toast.info('No pending timesheets to approve this week.')
      return
    }

    const loadId = toast.loading(`Approving ${pendingIds.length} pending timesheets...`)
    try {
      await bulkApprove({ ids: pendingIds, approvedBy: employee.id })
      await refetchEntries()
      toast.success(`Successfully approved all ${pendingIds.length} pending timesheets!`, { id: loadId })
    } catch (err: any) {
      toast.error('Failed to approve timesheets: ' + err.message, { id: loadId })
    }
  }

  // Selected bulk approve
  const handleBulkApprove = async () => {
    if (selectedRows.size === 0 || !employee?.id) return
    try {
      await bulkApprove({ ids: Array.from(selectedRows), approvedBy: employee.id })
      await refetchEntries()
      toast.success(`${selectedRows.size} entries approved`)
      setSelectedRows(new Set())
    } catch {
      toast.error('Failed to approve entries')
    }
  }

  // Sync actual clock-in/out records from Biometrics (attendance_records)
  const handleSyncFromAttendance = async () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      toast.info('No attendance clock-in records found for this week to sync.')
      return
    }

    const loadId = toast.loading('Syncing timesheets from biometric clock-ins...')
    try {
      const payload: Partial<TimesheetEntry>[] = []
      const existingKeySet = new Set(entries?.map(e => `${e.employee_id}_${e.date}`) || [])

      attendanceRecords.forEach(rec => {
        if (!rec.clock_in) return
        const dateStr = rec.date
        const key = `${rec.employee_id}_${dateStr}`
        
        // Convert clock_in / clock_out timestamps to HH:mm
        const startTime = format(parseISO(rec.clock_in), 'HH:mm')
        const endTime = rec.clock_out ? format(parseISO(rec.clock_out), 'HH:mm') : '17:00'
        
        // Calculate work hours
        const [sh, sm] = startTime.split(':').map(Number)
        const [eh, em] = endTime.split(':').map(Number)
        let totalMins = (eh * 60 + em) - (sh * 60 + sm)
        if (totalMins < 0) totalMins += 24 * 60
        const breakMins = 60
        const totalHours = Math.max(0, (totalMins - breakMins) / 60)
        const overtimeHours = Math.max(0, totalHours - 8)

        if (!existingKeySet.has(key)) {
          payload.push({
            employee_id: rec.employee_id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            break_minutes: breakMins,
            total_hours: totalHours,
            overtime_hours: overtimeHours,
            source: 'clock_in',
            notes: 'Synced from Face/GPS Attendance Clock-In',
          })
        }
      })

      if (payload.length === 0) {
        toast.info('All biometric records for this week are already synced to timesheets.', { id: loadId })
        return
      }

      await bulkCreate(payload)
      await refetchEntries()
      toast.success(`Successfully synced ${payload.length} verified attendance logs to timesheets!`, { id: loadId })
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: loadId })
    }
  }

  // Auto-fill standard schedule
  const handleAutoFillWeek = async () => {
    if (!employee?.id) return
    const workDays = weekDays.filter(d => !isWeekend(d))
    let targetEmployees = employees || []

    if (targetEmployees.length === 0) return

    const loadId = toast.loading('Generating standard work hours...')
    const newEntries: Partial<TimesheetEntry>[] = []
    
    targetEmployees.forEach(emp => {
      const existingDates = new Set(entries?.filter(e => e.employee_id === emp.id).map(e => e.date) || [])
      const missingDays = workDays.filter(d => !existingDates.has(format(d, 'yyyy-MM-dd')))
      
      missingDays.forEach(d => {
        newEntries.push({
          employee_id: emp.id,
          date: format(d, 'yyyy-MM-dd'),
          start_time: '09:00',
          end_time: '17:00',
          break_minutes: 60,
          total_hours: 7.0,
          overtime_hours: 0,
          source: 'manual',
          notes: 'Standard shift auto-fill'
        })
      })
    })

    if (newEntries.length === 0) {
      toast.info('All workdays for this week already have hours logged.', { id: loadId })
      return
    }

    try {
      await bulkCreate(newEntries)
      await refetchEntries()
      toast.success(`Auto-filled ${newEntries.length} missing timesheet logs across ${targetEmployees.length} employees!`, { id: loadId })
    } catch (err: any) {
      toast.error('Failed to auto-fill week: ' + err.message, { id: loadId })
    }
  }

  // AI Timesheet & Labor Audit
  const handleRunAiAudit = async () => {
    setAiAuditOpen(true)
    if (auditResult) return

    setIsAuditing(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not defined')
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

      const entriesSummary = entries?.map(e => {
        const empName = e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : 'Staff'
        return `- ${empName} (${e.date}): ${e.start_time}-${e.end_time}, Total: ${e.total_hours || 0}h, Overtime: ${e.overtime_hours || 0}h, Status: ${e.is_approved ? 'Approved' : 'Pending'}`
      }).slice(0, 50).join('\n') || 'No entries logged this week.'

      const prompt = `You are a Senior HR Payroll & Labor Compliance Auditor under Philippine Labor Code standards.
Audit the following weekly timesheet records:

Week: ${startDate} to ${endDate}
Total Logged Hours: ${stats.totalHours.toFixed(1)}h
Total Overtime: ${stats.overtime.toFixed(1)}h
Pending Approvals: ${stats.pending}
Approved Records: ${stats.approved}

Timesheet Logs Sample:
${entriesSummary}

Provide a crisp, actionable markdown audit with:
1. **Timesheet Health & Payroll Readiness Score** (e.g. 95/100).
2. **Overtime & Labor Compliance Observations** (Verify 8-hour daily baseline, highlight any excessive overtime >4h/day).
3. **Pending Approval Risks & Bottlenecks** (Entries needing supervisor sign-off before payroll cutoff).
4. **Actionable Checklist for HR** to finalize this payroll period.`

      const result = await model.generateContent(prompt)
      setAuditResult(result.response.text())
    } catch (err: any) {
      setAuditResult('Failed to run AI timesheet audit: ' + err.message)
    } finally {
      setIsAuditing(false)
    }
  }

  // Export timesheet CSV
  const handleExport = () => {
    if (!entries?.length) {
      toast.error('No timesheet data to export')
      return
    }
    const exportData = entries.map(e => ({
      'Employee Code': e.employees?.id?.slice(0, 8) || '',
      'Employee Name': e.employees ? `${e.employees.first_name} ${e.employees.last_name || ''}`.trim() : 'Unknown',
      'Department': e.employees?.departments?.name || 'Unassigned',
      'Date': e.date,
      'Clock In': e.start_time || '',
      'Clock Out': e.end_time || '',
      'Break (Mins)': e.break_minutes || 0,
      'Regular Hours': (Math.min(8, e.total_hours || 0)).toFixed(2),
      'Overtime Hours': (e.overtime_hours || 0).toFixed(2),
      'Total Paid Hours': (e.total_hours || 0).toFixed(2),
      'Status': e.is_approved ? 'APPROVED' : 'PENDING',
      'Source': e.source || 'manual',
      'Notes': e.notes || ''
    }))
    downloadCSV(exportData, `timesheet_payroll_export_${startDate}_to_${endDate}`)
    toast.success('Timesheet export downloaded successfully')
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id)
      await refetchEntries()
      toast.success('Entry deleted')
    } catch (err: any) {
      toast.error('Failed to delete entry: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet & Labor Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Verify clocked work hours, audit overtime premiums, and approve timesheets for payroll
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can.isSupervisor() && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncFromAttendance}
                className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                title="Pull real biometric face/GPS clock-ins into timesheets"
              >
                <RefreshCw className="size-3.5" />
                Sync Biometrics
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoFillWeek} 
                className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
              >
                <Wand2 className="size-3.5" />
                Auto-fill Standard
              </Button>
              {stats.pending > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleApproveAllPending} 
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCheck className="size-4" />
                  Approve All Pending ({stats.pending})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRunAiAudit}
                className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
              >
                <ShieldCheck className="size-3.5" />
                AI Timesheet Audit
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="size-4" />
            Export Payroll CSV
          </Button>
          <AddTimeEntryDialog
            employeeId={employee?.id || ''}
            open={addEntryOpen}
            onOpenChange={setAddEntryOpen}
            date={addEntryDate}
            onSuccess={() => {
              setAddEntryOpen(false)
              setAddEntryDate(undefined)
              refetchEntries()
            }}
          />
        </div>
      </div>

      {/* Week Navigator & Filters Card */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="flex flex-col md:flex-row items-center justify-between p-3.5 gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[210px] text-center">
              <p className="text-sm font-bold">
                {format(currentWeekStart, 'MMM d')} – {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Work Week {format(currentWeekStart, 'w')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              This Week
            </Button>
          </div>

          {can.isSupervisor() && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  className="w-36 pl-8 h-8 text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedEmployee || 'all'} onValueChange={v => setSelectedEmployee(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="All personnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel</SelectItem>
                  {allEmployees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Paid Hours</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {stats.totalHours.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Regular: {stats.regularHours.toFixed(1)}h</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overtime Premium</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  +{stats.overtime.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">DOLE +25% OT Rate</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <TrendingUp className="size-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {stats.pending}<span className="text-sm font-normal text-muted-foreground ml-1">entries</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting supervisor verification</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <Timer className="size-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved Logs</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {stats.approved}<span className="text-sm font-normal text-muted-foreground ml-1">entries</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ready for payroll export</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <UserCheck className="size-4.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Bulk Actions Bar */}
      {can.approveTimesheet() && selectedRows.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 p-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <FileCheck className="size-4" />
            <span>{selectedRows.size} timesheet entries selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleBulkApprove} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="size-3.5" />
              Approve Selected
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>
              Cancel Selection
            </Button>
          </div>
        </div>
      )}

      {/* Main Timesheet View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="text-xs h-8"
            >
              All Logs ({entries?.length || 0})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
              className="text-xs h-8 gap-1.5"
            >
              Pending
              {stats.pending > 0 && (
                <Badge className="size-4.5 p-0 flex items-center justify-center rounded-full text-[10px] bg-amber-500 text-white">
                  {stats.pending}
                </Badge>
              )}
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
              className="text-xs h-8"
            >
              Approved ({stats.approved})
            </Button>
            <Button
              variant={statusFilter === 'overtime' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('overtime')}
              className="text-xs h-8 text-amber-600"
            >
              With Overtime
            </Button>
          </div>

          <TabsList className="h-8">
            <TabsTrigger value="grid" className="text-xs">Weekly Roster Table</TabsTrigger>
            <TabsTrigger value="detailed" className="text-xs">Detailed Entry Logs</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Weekly Matrix Table */}
        <TabsContent value="grid" className="m-0 space-y-4">
          <Card className="border-border/70 shadow-xs overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={9} rows={6} withHeader={false} />
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader className="bg-muted/70">
                    <TableRow>
                      {can.approveTimesheet() && (
                        <TableHead className="w-10 text-center">
                          <Checkbox
                            checked={employees.length > 0 && employees.every(e => selectedRows.has(e.id))}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRows(new Set(employees.map(e => e.id)))
                              } else {
                                setSelectedRows(new Set())
                              }
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead className="min-w-[180px] font-semibold text-foreground">Employee Staff</TableHead>
                      {weekDays.map(day => (
                        <TableHead key={day.toISOString()} className={`text-center min-w-[70px] ${isWeekend(day) ? 'bg-muted/30 text-muted-foreground/60' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE')}</span>
                            <span className={`text-xs font-semibold ${isToday(day) ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[100px] font-semibold text-foreground">Weekly Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={weekDays.length + 3} className="text-center py-8 text-sm text-muted-foreground">
                          No employees found matching the filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => {
                        const empEntries = filteredEntries.filter(e => e.employee_id === emp.id)
                        const weekTotal = empEntries.reduce((sum, d) => sum + (d.total_hours || 0), 0)
                        const weekOT = empEntries.reduce((sum, d) => sum + (d.overtime_hours || 0), 0)
                        
                        return (
                          <TableRow key={emp.id} className="hover:bg-muted/20 transition-colors">
                            {can.approveTimesheet() && (
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={selectedRows.has(emp.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedRows)
                                    if (checked) newSet.add(emp.id)
                                    else newSet.delete(emp.id)
                                    setSelectedRows(newSet)
                                  }}
                                />
                              </TableCell>
                            )}
                            <TableCell className="p-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar className="size-7 ring-1 ring-border">
                                  {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                                  <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                    {`${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs text-foreground truncate">{emp.first_name} {emp.last_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.departments?.name || emp.position || 'Staff'}</p>
                                </div>
                              </div>
                            </TableCell>

                            {weekDays.map(day => {
                              const dateStr = format(day, 'yyyy-MM-dd')
                              const entry = empEntries.find(e => e.date === dateStr)
                              const isWeekendDay = isWeekend(day)
                              return (
                                <td key={dateStr} className={`p-1 text-center border-r border-border/30 ${isWeekendDay ? 'bg-muted/15' : ''}`}>
                                  {entry ? (
                                    <div 
                                      className={`group/cell relative mx-auto flex flex-col items-center justify-center p-1 rounded-md border cursor-pointer transition-all shadow-2xs hover:scale-105 ${
                                        entry.is_approved 
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                                      }`}
                                      onClick={() => setEditingEntry(entry)}
                                      title={`${entry.start_time}–${entry.end_time} (${entry.total_hours?.toFixed(1)}h) - Click to edit`}
                                    >
                                      <span className="font-bold text-[11px]">{entry.total_hours?.toFixed(1)}h</span>
                                      {entry.overtime_hours > 0 && (
                                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">+{entry.overtime_hours.toFixed(1)} OT</span>
                                      )}
                                      <div className="flex items-center gap-0.5 mt-0.5">
                                        {entry.is_approved ? (
                                          <CheckCircle className="size-2.5 text-emerald-600" />
                                        ) : (
                                          <Clock className="size-2.5 text-amber-600" />
                                        )}
                                        <span className="text-[8px] uppercase">{entry.is_approved ? 'Appr' : 'Pend'}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="group/cell relative size-full min-h-[30px] flex items-center justify-center">
                                      {can.editTimesheet() && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-5 opacity-0 group-hover/cell:opacity-100 bg-background shadow-xs hover:bg-primary hover:text-primary-foreground transition-opacity rounded"
                                          onClick={() => {
                                            setAddEntryDate(day)
                                            setAddEntryOpen(true)
                                          }}
                                          title={`Add time entry for ${emp.first_name} on ${dateStr}`}
                                        >
                                          <Plus className="size-2.5" />
                                        </Button>
                                      )}
                                      <span className="text-muted-foreground/30 text-[11px]">—</span>
                                    </div>
                                  )}
                                </td>
                              )
                            })}

                            <TableCell className="text-right p-2.5">
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-xs text-foreground">{weekTotal.toFixed(1)}h</span>
                                {weekOT > 0 && (
                                  <span className="text-[10px] text-amber-600 font-semibold">+{weekOT.toFixed(1)}h OT</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Detailed Line-Item Logs */}
        <TabsContent value="detailed" className="m-0 space-y-4">
          <Card className="border-border/70 shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-muted/70">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead className="text-right">Regular</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}><Skeleton className="h-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                        No time logs match the active filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map(entry => (
                      <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">
                          {format(parseISO(entry.date), 'EEE, MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 ring-1 ring-border">
                              {entry.employees?.avatar_url && <AvatarImage src={entry.employees.avatar_url} className="object-cover" />}
                              <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                                {`${entry.employees?.first_name?.[0] ?? ''}${entry.employees?.last_name?.[0] ?? ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{entry.employees?.first_name} {entry.employees?.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {entry.start_time} – {entry.end_time}
                        </TableCell>
                        <TableCell>{entry.break_minutes || 0}m</TableCell>
                        <TableCell className="text-right font-medium">
                          {(Math.min(8, entry.total_hours || 0)).toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">
                          {entry.overtime_hours > 0 ? `+${entry.overtime_hours.toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {(entry.total_hours || 0).toFixed(1)}h
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-medium capitalize">
                            {entry.source || 'manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={entry.is_approved ? STATUS_CONFIG.approved.className : STATUS_CONFIG.pending.className}>
                            {entry.is_approved ? 'Approved' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {can.approveTimesheet() && !entry.is_approved && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                  onClick={async () => {
                                    if (employee?.id) {
                                      await approveEntry({ id: entry.id, approvedBy: employee.id })
                                      await refetchEntries()
                                      toast.success('Timesheet approved')
                                    }
                                  }}
                                  title="Approve Entry"
                                >
                                  <CheckCircle className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => setRejectingEntry(entry)}
                                  title="Reject Entry with reason"
                                >
                                  <Ban className="size-3.5" />
                                </Button>
                              </>
                            )}
                            {(!entry.is_approved || can.editTimesheet()) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-7 text-muted-foreground hover:text-foreground" 
                                onClick={() => setEditingEntry(entry)}
                                title="Edit Entry"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            )}
                            {(!entry.is_approved || can.editTimesheet()) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-7 text-destructive hover:bg-destructive/10" 
                                onClick={() => handleDelete(entry.id)}
                                title="Delete Entry"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <EditTimeEntryDialog entry={editingEntry} onClose={() => {
          setEditingEntry(null)
          refetchEntries()
        }} />
      )}

      {/* Reject Dialog */}
      {rejectingEntry && (
        <RejectDialog entry={rejectingEntry} onClose={() => {
          setRejectingEntry(null)
          refetchEntries()
        }} />
      )}

      {/* AI Timesheet Labor Audit Dialog */}
      <Dialog open={aiAuditOpen} onOpenChange={setAiAuditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600 font-bold">
              <Sparkles className="size-5" /> AI Timesheet Audit & Payroll Pre-Check
            </DialogTitle>
            <DialogDescription>
              Deep audit of work hours, overtime premiums, and labor compliance under Philippine DOLE rules.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[220px] max-h-[60vh] overflow-y-auto pr-2 flex flex-col pt-2">
            {isAuditing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                <RefreshCw className="size-9 animate-spin text-indigo-500" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                  Auditing timesheet entries for payroll readiness...
                </p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-3 leading-relaxed whitespace-pre-wrap">
                {auditResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
