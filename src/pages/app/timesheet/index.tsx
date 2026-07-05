import { useState, useMemo } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isWeekend, parseISO } from 'date-fns'
import {
  Clock, CheckCircle, XCircle, Plus, ChevronLeft, ChevronRight,
  Download, TrendingUp, TrendingDown, Timer, UserCheck, Edit2, Trash2,
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
  useBulkApproveTimesheetEntries,
  getWeekRange,
} from '@/hooks/use-timesheets'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
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
    if (endMins <= startMins) return 0
    const total = (endMins - startMins - form.break_minutes) / 60
    return Math.max(0, total)
  }

  const hours = calcHours()
  const overtime = Math.max(0, hours - 8)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hours <= 0) { toast.error('End time must be after start time'); return }
    try {
      await mutateAsync({
        id: entry.id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: form.break_minutes,
        overtime_hours: overtime,
        notes: form.notes || undefined,
      })
      toast.success('Entry updated')
      onClose()
    } catch (err: any) {
      toast.error('Failed to update entry', { description: err.message })
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Hours</span>
              <span className="font-semibold">{hours.toFixed(1)}h</span>
            </div>
            {overtime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overtime</span>
                <span className="font-semibold text-amber-600">{overtime.toFixed(1)}h</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
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
  onSuccess,
}: {
  employeeId: string
  date?: Date
  onSuccess: () => void
}) {
  const { mutateAsync, isPending } = useCreateTimesheetEntry()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 60,
    notes: '',
    overtime_hours: 0,
  })

  const calcHours = () => {
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    if (endMins <= startMins) return 0
    const total = (endMins - startMins - form.break_minutes) / 60
    return Math.max(0, total)
  }

  const hours = calcHours()
  const overtime = Math.max(0, hours - 8)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutateAsync({
        employee_id: employeeId,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        break_minutes: form.break_minutes,
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
          <DialogTitle>Add Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Hours</span>
              <span className="font-semibold">{hours.toFixed(1)}h</span>
            </div>
            {overtime > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overtime</span>
                <span className="font-semibold text-amber-600">{overtime.toFixed(1)}h</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes..."
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

export default function TimesheetPage() {
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>(undefined)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null)

  const { startDate, endDate } = useMemo(() => ({
    startDate: format(currentWeekStart, 'yyyy-MM-dd'),
    endDate: format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }), [currentWeekStart])

  const { data: employees } = useEmployees()
  const { data: entries, isLoading } = useTimesheetEntries(selectedEmployee, startDate, endDate)
  const { mutateAsync: approveEntry } = useApproveTimesheetEntry()
  const { mutateAsync: bulkApprove } = useBulkApproveTimesheetEntries()
  const { mutateAsync: deleteEntry } = useDeleteTimesheetEntry()

  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) })

  // Summary stats
  const stats = useMemo(() => {
    if (!entries) return { totalHours: 0, overtime: 0, pending: 0, approved: 0 }
    return {
      totalHours: entries.reduce((sum, e) => sum + (e.total_hours || 0), 0),
      overtime: entries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0),
      pending: entries.filter(e => !e.is_approved).length,
      approved: entries.filter(e => e.is_approved).length,
    }
  }, [entries])

  // Entries grouped by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimesheetEntry[]>()
    entries?.forEach(e => {
      const arr = map.get(e.date) || []
      arr.push(e)
      map.set(e.date, arr)
    })
    return map
  }, [entries])

  const handleBulkApprove = async () => {
    if (selectedRows.size === 0 || !employee?.id) return
    try {
      await bulkApprove({ ids: Array.from(selectedRows), approvedBy: employee.id })
      toast.success(`${selectedRows.size} entries approved`)
      setSelectedRows(new Set())
    } catch {
      toast.error('Failed to approve entries')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id)
      toast.success('Entry deleted')
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
          <p className="text-sm text-muted-foreground">Track and approve work hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" />
            Export
          </Button>
          <AddTimeEntryDialog
            employeeId={employee?.id || ''}
            onSuccess={() => {}}
          />
        </div>
      </div>

      {/* Week navigation */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[200px] text-center">
              <p className="text-sm font-semibold">
                {format(currentWeekStart, 'MMM d')} – {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">Week {format(currentWeekStart, 'w')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              This Week
            </Button>
          </div>
          {can.isSupervisor() && (
            <Select value={selectedEmployee || 'all'} onValueChange={v => setSelectedEmployee(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees?.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Hours', value: stats.totalHours.toFixed(1), icon: Clock, color: 'text-primary', bg: 'bg-primary/10', unit: 'h' },
          { label: 'Overtime', value: stats.overtime.toFixed(1), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/50', unit: 'h' },
          { label: 'Pending', value: stats.pending, icon: Timer, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950/50', unit: 'entries' },
          { label: 'Approved', value: stats.approved, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50', unit: 'entries' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}<span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span></p>
                </div>
                <div className={`flex size-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk actions */}
      {can.approveTimesheet() && selectedRows.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3">
          <span className="text-sm text-muted-foreground">{selectedRows.size} selected</span>
          <Button size="sm" onClick={handleBulkApprove} className="gap-1.5">
            <CheckCircle className="size-3.5" />
            Approve Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Timesheet grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Timesheet</CardTitle>
          <CardDescription>Hours logged per day</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {can.approveTimesheet() && <TableHead className="w-10"><Checkbox /></TableHead>}
                  <TableHead>Employee</TableHead>
                  {weekDays.map(day => (
                    <TableHead key={day.toISOString()} className={`text-center ${isWeekend(day) ? 'text-muted-foreground/50' : ''}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</span>
                        <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>{format(day, 'd')}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={weekDays.length + 3} className="text-center py-8 text-sm text-muted-foreground">
                      No timesheet entries for this week
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(
                    (entries || []).reduce((acc, e) => {
                      const key = e.employee_id
                      if (!acc[key]) acc[key] = { employee: e.employees, days: {} }
                      acc[key].days[e.date] = e
                      return acc
                    }, {} as Record<string, { employee: any; days: Record<string, TimesheetEntry> }>)
                  ).map(([empId, data]) => {
                    const weekTotal = Object.values(data.days).reduce((sum, d) => sum + (d.total_hours || 0), 0)
                    return (
                      <TableRow key={empId}>
                        {can.approveTimesheet() && (
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(empId)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedRows)
                                if (checked) newSet.add(empId)
                                else newSet.delete(empId)
                                setSelectedRows(newSet)
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                                {`${data.employee?.first_name?.[0] ?? ''}${data.employee?.last_name?.[0] ?? ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{data.employee?.first_name} {data.employee?.last_name}</span>
                          </div>
                        </TableCell>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd')
                          const entry = data.days[dateStr]
                          const isWeekendDay = isWeekend(day)
                          return (
                            <TableCell key={dateStr} className={`text-center ${isWeekendDay ? 'bg-muted/30' : ''}`}>
                              {entry ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-medium text-sm">{entry.total_hours?.toFixed(1)}</span>
                                  {entry.overtime_hours > 0 && (
                                    <span className="text-[10px] text-amber-600">+{entry.overtime_hours.toFixed(1)} OT</span>
                                  )}
                                  {entry.is_approved && (
                                    <CheckCircle className="size-3 text-emerald-500" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right font-semibold">{weekTotal.toFixed(1)}h</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detailed entries list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detailed Entries</CardTitle>
          <CardDescription>All time entries for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">OT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8" /></TableCell>
                  </TableRow>
                ))
              ) : (entries?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                    No entries
                  </TableCell>
                </TableRow>
              ) : (
                entries?.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className="text-sm">{format(parseISO(entry.date), 'EEE, MMM d')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                            {`${entry.employees?.first_name?.[0] ?? ''}${entry.employees?.last_name?.[0] ?? ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{entry.employees?.first_name} {entry.employees?.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.start_time} – {entry.end_time}
                    </TableCell>
                    <TableCell className="text-right font-medium">{entry.total_hours?.toFixed(1)}h</TableCell>
                    <TableCell className="text-right text-sm text-amber-600">
                      {entry.overtime_hours > 0 ? `+${entry.overtime_hours.toFixed(1)}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={entry.is_approved ? STATUS_CONFIG.approved.className : STATUS_CONFIG.pending.className}>
                        {entry.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {can.approveTimesheet() && !entry.is_approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => employee?.id && approveEntry({ id: entry.id, approvedBy: employee.id })}
                          >
                            <CheckCircle className="size-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingEntry(entry)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingEntry && (
        <EditTimeEntryDialog entry={editingEntry} onClose={() => setEditingEntry(null)} />
      )}
    </div>
  )
}
