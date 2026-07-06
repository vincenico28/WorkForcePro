import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isWeekend, addMonths, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Loader2, X } from 'lucide-react'
import { useEmployees } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useShifts, useSchedules, useCreateSchedule, useDeleteSchedule } from '@/hooks/use-schedules'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Schedule } from '@/types'

export default function SchedulePage() {
  const { can } = usePermissions()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ employee_id: '', shift_id: '', date: format(new Date(), 'yyyy-MM-dd') })

  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: shifts, isLoading: shiftsLoading } = useShifts()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = format(monthStart, 'yyyy-MM-dd')
  const endDate = format(monthEnd, 'yyyy-MM-dd')

  const { data: schedules, isLoading: schedLoading } = useSchedules(
    startDate, endDate,
    selectedEmployee === 'all' ? undefined : selectedEmployee,
  )

  const createSchedule = useCreateSchedule()
  const deleteSchedule = useDeleteSchedule()

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const filteredEmployees = employees ?? []
  const isLoading = empLoading || shiftsLoading || schedLoading

  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>()
    schedules?.forEach(s => { map.set(`${s.employee_id}_${s.date}`, s) })
    return map
  }, [schedules])

  const shiftColors: Record<string, { bg: string; text: string }> = {}
  shifts?.forEach(s => { shiftColors[s.id] = { bg: s.color + '20', text: s.color } })

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todaySchedules = schedules?.filter(s => s.date === todayStr) ?? []

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createSchedule.mutateAsync({
        employee_id: assignForm.employee_id,
        shift_id: assignForm.shift_id,
        date: assignForm.date,
        status: 'scheduled',
      })
      toast.success('Schedule assigned')
      setAssignOpen(false)
    } catch (err: any) {
      toast.error(err.message?.includes('unique') ? 'Employee already has a schedule on that date' : err.message)
    }
  }

  const handleRemoveSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId)
      toast.success('Schedule removed')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Manage shifts and employee schedules</p>
        </div>
        {can.manageSchedule() && (
          <Button className="gap-1.5 shrink-0" onClick={() => setAssignOpen(true)}>
            <Plus className="size-4" />Assign Shift
          </Button>
        )}
      </div>

      {/* Shift legend */}
      {shifts && shifts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {shifts.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className="size-3 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground/60">
                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="min-w-[160px] text-center text-base font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
          </div>
          {can.isSupervisor() && (
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-40 bg-card p-2 text-left">
                    <span className="text-xs font-medium text-muted-foreground">Employee</span>
                  </th>
                  {days.map(day => (
                    <th key={day.toISOString()} className={`min-w-[36px] p-1 text-center ${isWeekend(day) ? 'opacity-40' : ''}`}>
                      <div className={`mx-auto flex size-7 flex-col items-center justify-center rounded-full text-xs ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>
                        <span className="font-medium leading-none">{format(day, 'd')}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-muted-foreground">{format(day, 'EEE')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="border-t border-border hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-card p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                            {`${emp.first_name[0]}${emp.last_name[0] ?? ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{emp.first_name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{emp.departments?.name}</p>
                        </div>
                      </div>
                    </td>
                    {days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const sched = scheduleMap.get(`${emp.id}_${dateStr}`)
                      const shift = sched?.shifts
                      const colors = shift ? shiftColors[shift.id] : undefined

                      return (
                        <td key={day.toISOString()} className={`p-0.5 text-center ${isWeekend(day) ? 'bg-muted/20' : ''}`}>
                          {shift && colors && sched ? (
                            <div
                              className="group/cell relative mx-auto flex size-6 items-center justify-center rounded text-[9px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ background: colors.bg, color: colors.text }}
                              title={`${shift.name}: ${shift.start_time} – ${shift.end_time}`}
                            >
                              {shift.name[0]}
                              {can.manageSchedule() && (
                                <button
                                  onClick={() => handleRemoveSchedule(sched.id)}
                                  className="absolute -right-1 -top-1 hidden size-3 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover/cell:flex"
                                >
                                  <X className="size-2" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="group/cell relative size-full">
                              {can.manageSchedule() && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover/cell:opacity-100">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 bg-background shadow-sm hover:bg-muted"
                                    onClick={() => {
                                      setAssignForm(f => ({ ...f, employee_id: emp.id, date: dateStr }))
                                      setAssignOpen(true)
                                    }}
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today's Assigned Shifts</CardTitle>
            <CardDescription>Employees scheduled for {format(new Date(), 'MMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySchedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts scheduled for today</p>
            ) : (
              todaySchedules.slice(0, 5).map(sched => {
                const emp = sched.employees
                const shift = sched.shifts
                return emp && shift ? (
                  <div key={sched.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {`${emp.first_name[0]}${emp.last_name[0] ?? ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{emp.first_name} {emp.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.position}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium shrink-0"
                      style={{ backgroundColor: shift.color + '20', color: shift.color }}
                    >
                      {shift.name}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                    </span>
                  </div>
                ) : null
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Shift Templates</CardTitle>
            <CardDescription>Available shift patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {shifts?.map(shift => {
              const monthCount = schedules?.filter(s => s.shift_id === shift.id).length ?? 0
              return (
                <div key={shift.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="size-3 rounded-full shrink-0" style={{ background: shift.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{shift.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)} · {shift.break_duration}min break
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{monthCount} this month</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Assign Shift Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={assignForm.employee_id} onValueChange={v => setAssignForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift *</Label>
              <Select value={assignForm.shift_id} onValueChange={v => setAssignForm(f => ({ ...f, shift_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  {shifts?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <input
                type="date"
                value={assignForm.date}
                onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={createSchedule.isPending || !assignForm.employee_id || !assignForm.shift_id}
              >
                {createSchedule.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Assign
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
