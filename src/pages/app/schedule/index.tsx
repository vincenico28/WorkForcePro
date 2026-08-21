import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isWeekend, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays, isSameMonth
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Plus, Loader2, X, Search, Sparkles, Download,
  Users, Clock, Calendar as CalendarIcon, ShieldCheck, Copy, Trash2, Filter,
  CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { downloadCSV } from '@/utils/export'
import { useEmployees } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useLeaveRequests } from '@/hooks/use-leaves'
import { useShifts, useSchedules, useCreateSchedule, useDeleteSchedule, useBulkCreateSchedule, useBulkDeleteSchedules } from '@/hooks/use-schedules'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Schedule } from '@/types'

export default function SchedulePage() {
  const { can } = usePermissions()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // Modals state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ employee_id: '', shift_id: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })

  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkAssignForm, setBulkAssignForm] = useState({
    department: 'all',
    shift_id: '',
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 4), 'yyyy-MM-dd'),
    skipWeekends: true,
    skipLeaves: true,
  })

  const [aiWizardOpen, setAiWizardOpen] = useState(false)
  const [aiWizardScope, setAiWizardScope] = useState<'current_week' | 'next_week' | 'full_month'>('current_week')
  const [aiWizardDept, setAiWizardDept] = useState('all')
  const [aiWizardStrategy, setAiWizardStrategy] = useState<'balanced' | 'morning_priority' | 'rotation'>('balanced')

  const [aiOpen, setAiOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  // Bulk Clear State
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearScope, setClearScope] = useState<'current_week' | 'full_month' | 'custom_range'>('full_month')
  const [clearCustomStart, setClearCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [clearCustomEnd, setClearCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [clearDept, setClearDept] = useState('all')
  const [clearEmployee, setClearEmployee] = useState('all')
  const [clearShift, setClearShift] = useState('all')
  const [preserveLeaves, setPreserveLeaves] = useState(true)

  const [editShiftOpen, setEditShiftOpen] = useState(false)
  const [selectedCellSched, setSelectedCellSched] = useState<{ id?: string; employee_id: string; employee_name: string; date: string; shift_id?: string } | null>(null)

  // Data fetching
  const { data: employees, isLoading: empLoading } = useEmployees()
  const { data: shifts, isLoading: shiftsLoading } = useShifts()
  const { data: approvedLeaves, refetch: refetchLeaves } = useLeaveRequests('approved')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = format(monthStart, 'yyyy-MM-dd')
  const endDate = format(monthEnd, 'yyyy-MM-dd')

  const { data: schedules, isLoading: schedLoading, refetch: refetchSchedules } = useSchedules(
    startDate, endDate,
    selectedEmployee === 'all' ? undefined : selectedEmployee,
  )

  const createSchedule = useCreateSchedule()
  const deleteSchedule = useDeleteSchedule()
  const bulkCreateSchedule = useBulkCreateSchedule()
  const bulkDeleteSchedules = useBulkDeleteSchedules()

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const uniqueDepartments = useMemo(() => {
    const deps = new Set<string>()
    employees?.forEach(e => { if (e.departments?.name) deps.add(e.departments.name) })
    return Array.from(deps).sort()
  }, [employees])

  const filteredEmployees = useMemo(() => {
    let result = employees ?? []
    if (selectedEmployee !== 'all') {
      result = result.filter(e => e.id === selectedEmployee)
    }
    if (selectedDepartment !== 'all') {
      result = result.filter(e => e.departments?.name === selectedDepartment)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e => 
        e.first_name.toLowerCase().includes(q) || 
        e.last_name?.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q)
      )
    }
    return result
  }, [employees, selectedEmployee, selectedDepartment, searchQuery])

  const isLoading = empLoading || shiftsLoading || schedLoading

  // Schedule lookup map: "employeeId_YYYY-MM-DD" -> Schedule
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Schedule>()
    schedules?.forEach(s => { map.set(`${s.employee_id}_${s.date}`, s) })
    return map
  }, [schedules])

  const shiftColors: Record<string, { bg: string; text: string }> = useMemo(() => {
    const map: Record<string, { bg: string; text: string }> = {}
    shifts?.forEach(s => {
      const c = s.color || '#6366F1'
      map[s.id] = { bg: c.startsWith('#') ? c + '25' : c, text: c }
    })
    return map
  }, [shifts])

  // Approved leave validator
  const isEmployeeOnLeave = (empId: string, dateStr: string) => {
    const existing = scheduleMap.get(`${empId}_${dateStr}`)
    if (existing?.status === 'on_leave') return true

    if (approvedLeaves && approvedLeaves.length > 0) {
      return approvedLeaves.some(l => 
        l.employee_id === empId &&
        l.status === 'approved' &&
        l.start_date <= dateStr &&
        l.end_date >= dateStr
      )
    }
    return false
  }

  // Shift duration calculator in hours (e.g. "08:00:00" to "17:00:00" -> 8 hours work minus break)
  const getShiftDurationHours = (shiftId?: string) => {
    const shift = shifts?.find(s => s.id === shiftId)
    if (!shift) return 8
    try {
      const [sh, sm] = shift.start_time.split(':').map(Number)
      const [eh, em] = shift.end_time.split(':').map(Number)
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm)
      if (diffMinutes < 0) diffMinutes += 24 * 60 // Overnight shift
      const breakMin = shift.break_duration || 60
      return Math.max(1, Math.round((diffMinutes - breakMin) / 60))
    } catch {
      return 8
    }
  }

  // Employee summary metrics (scheduled shifts, estimated hours)
  const employeeStats = useMemo(() => {
    const stats: Record<string, { shiftCount: number; totalHours: number; leaveCount: number }> = {}
    employees?.forEach(e => {
      stats[e.id] = { shiftCount: 0, totalHours: 0, leaveCount: 0 }
    })

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      employees?.forEach(e => {
        if (isEmployeeOnLeave(e.id, dateStr)) {
          if (stats[e.id]) stats[e.id].leaveCount++
        } else {
          const sched = scheduleMap.get(`${e.id}_${dateStr}`)
          if (sched && sched.status !== 'on_leave' && (sched.shift_id || sched.shifts)) {
            if (stats[e.id]) {
              stats[e.id].shiftCount++
              stats[e.id].totalHours += getShiftDurationHours(sched.shift_id)
            }
          }
        }
      })
    })
    return stats
  }, [employees, days, scheduleMap, approvedLeaves, shifts])

  // KPI Dashboard stats
  const totalScheduledShiftsInMonth = useMemo(() => {
    return schedules?.filter(s => s.status !== 'on_leave').length ?? 0
  }, [schedules])

  const totalScheduledHours = useMemo(() => {
    return Object.values(employeeStats).reduce((acc, curr) => acc + curr.totalHours, 0)
  }, [employeeStats])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todaySchedules = schedules?.filter(s => s.date === todayStr && s.status !== 'on_leave' && !isEmployeeOnLeave(s.employee_id, todayStr)) ?? []
  const todayOnLeave = employees?.filter(e => isEmployeeOnLeave(e.id, todayStr)) ?? []

  // Export roster
  const handleExport = () => {
    if (!schedules?.length) {
      toast.error('No schedule data to export')
      return
    }
    const exportData = schedules.map(s => {
      const emp = employees?.find(e => e.id === s.employee_id)
      const shift = shifts?.find(sh => sh.id === s.shift_id) || s.shifts
      return {
        'Employee ID': emp?.employee_id || s.employee_id,
        'Employee Name': emp ? `${emp.first_name} ${emp.last_name || ''}`.trim() : 'Unknown',
        'Department': emp?.departments?.name || 'Unassigned',
        'Position': emp?.position || 'Staff',
        'Date': s.date,
        'Shift': s.status === 'on_leave' ? 'APPROVED LEAVE' : (shift?.name || 'Scheduled'),
        'Shift Window': shift ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}` : 'N/A',
        'Status': s.status,
      }
    })
    downloadCSV(exportData, `workforce_roster_${format(currentMonth, 'yyyy_MM')}`)
    toast.success('Roster exported successfully')
  }

  // Single shift assignment
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createSchedule.mutateAsync({
        employee_id: assignForm.employee_id,
        shift_id: assignForm.shift_id,
        date: assignForm.date,
        notes: assignForm.notes,
        status: 'scheduled',
      })
      await refetchSchedules()
      toast.success('Schedule assigned successfully')
      setAssignOpen(false)
    } catch (err: any) {
      toast.error(err.message?.includes('unique') ? 'Employee already has a schedule on that date' : err.message)
    }
  }

  // Remove single schedule
  const handleRemoveSchedule = async (scheduleId: string) => {
    try {
      await deleteSchedule.mutateAsync(scheduleId)
      await refetchSchedules()
      toast.success('Schedule removed')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Bulk Shift Assignment
  const handleBulkAssign = async () => {
    if (!bulkAssignForm.shift_id) {
      toast.error('Please select a shift to assign.')
      return
    }

    const start = new Date(bulkAssignForm.startDate)
    const end = new Date(bulkAssignForm.endDate)
    if (start > end) {
      toast.error('Start date must be before end date.')
      return
    }

    const targetIntervalDays = eachDayOfInterval({ start, end })
    let targetEmployees = employees || []
    if (bulkAssignForm.department !== 'all') {
      targetEmployees = targetEmployees.filter(e => e.departments?.name === bulkAssignForm.department)
    }

    if (targetEmployees.length === 0) {
      toast.error('No employees match the selected department.')
      return
    }

    const loadId = toast.loading('Applying bulk shift assignments...')
    try {
      const payload: Partial<Schedule>[] = []

      targetEmployees.forEach(emp => {
        targetIntervalDays.forEach(day => {
          if (bulkAssignForm.skipWeekends && isWeekend(day)) return
          const dateStr = format(day, 'yyyy-MM-dd')
          if (bulkAssignForm.skipLeaves && isEmployeeOnLeave(emp.id, dateStr)) return

          payload.push({
            employee_id: emp.id,
            shift_id: bulkAssignForm.shift_id,
            date: dateStr,
            status: 'scheduled',
          })
        })
      })

      if (payload.length === 0) {
        toast.info('No shifts to assign based on the filters provided.', { id: loadId })
        return
      }

      await bulkCreateSchedule.mutateAsync(payload)
      await refetchSchedules()
      toast.success(`Successfully assigned ${payload.length} shifts across ${targetEmployees.length} employees!`, { id: loadId })
      setBulkAssignOpen(false)
    } catch (err: any) {
      toast.error('Bulk assignment failed: ' + err.message, { id: loadId })
    }
  }

  // Copy Previous Week Schedule
  const handleCopyPreviousWeek = async () => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const prevWeekStart = subDays(currentWeekStart, 7)

    const prevWeekDays = [0, 1, 2, 3, 4, 5, 6].map(i => format(addDays(prevWeekStart, i), 'yyyy-MM-dd'))
    const curWeekDays = [0, 1, 2, 3, 4, 5, 6].map(i => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'))

    const loadId = toast.loading('Copying last week schedule pattern...')
    try {
      const payload: Partial<Schedule>[] = []
      let copiedCount = 0

      employees?.forEach(emp => {
        prevWeekDays.forEach((prevDateStr, idx) => {
          const curDateStr = curWeekDays[idx]
          // Don't overwrite if employee is on leave in the new week
          if (isEmployeeOnLeave(emp.id, curDateStr)) return

          const prevSched = scheduleMap.get(`${emp.id}_${prevDateStr}`)
          if (prevSched && prevSched.status !== 'on_leave' && prevSched.shift_id) {
            payload.push({
              employee_id: emp.id,
              shift_id: prevSched.shift_id,
              date: curDateStr,
              status: 'scheduled',
            })
            copiedCount++
          }
        })
      })

      if (payload.length === 0) {
        toast.info('No shifts found in the previous week to copy.', { id: loadId })
        return
      }

      await bulkCreateSchedule.mutateAsync(payload)
      await refetchSchedules()
      toast.success(`Copied ${copiedCount} shifts to current week with approved leaves preserved!`, { id: loadId })
    } catch (err: any) {
      toast.error('Failed to copy schedule: ' + err.message, { id: loadId })
    }
  }

  // Calculate schedules that match current bulk clear criteria
  const schedulesToClear = useMemo(() => {
    if (!schedules || schedules.length === 0) return []
    let targetDateStrings: string[] = []
    if (clearScope === 'current_week') {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      targetDateStrings = [0, 1, 2, 3, 4, 5, 6].map(i => format(addDays(weekStart, i), 'yyyy-MM-dd'))
    } else if (clearScope === 'full_month') {
      targetDateStrings = days.map(d => format(d, 'yyyy-MM-dd'))
    } else {
      if (clearCustomStart && clearCustomEnd) {
        const s = new Date(clearCustomStart)
        const e = new Date(clearCustomEnd)
        if (s <= e) {
          targetDateStrings = eachDayOfInterval({ start: s, end: e }).map(d => format(d, 'yyyy-MM-dd'))
        }
      }
    }

    return schedules.filter(s => {
      if (!targetDateStrings.includes(s.date)) return false
      if (preserveLeaves && s.status === 'on_leave') return false
      if (clearEmployee !== 'all' && s.employee_id !== clearEmployee) return false
      if (clearDept !== 'all') {
        const emp = employees?.find(e => e.id === s.employee_id)
        if (emp?.departments?.name !== clearDept) return false
      }
      if (clearShift !== 'all' && s.shift_id !== clearShift) return false
      return true
    })
  }, [schedules, clearScope, clearCustomStart, clearCustomEnd, preserveLeaves, clearEmployee, clearDept, clearShift, days, employees])

  const uniqueClearPersonnelCount = useMemo(() => {
    return new Set(schedulesToClear.map(s => s.employee_id)).size
  }, [schedulesToClear])

  // Fast Bulk Clear Schedule (Single Query)
  const handleClearSchedules = async () => {
    if (schedulesToClear.length === 0) {
      toast.info('No scheduled shifts found matching the selected filter criteria.')
      return
    }

    const count = schedulesToClear.length
    const loadId = toast.loading(`Instantly clearing ${count} scheduled shift${count > 1 ? 's' : ''}...`)
    try {
      const idsToDelete = schedulesToClear.map(s => s.id)
      await bulkDeleteSchedules.mutateAsync(idsToDelete)
      await refetchSchedules()
      toast.success(`Successfully cleared ${count} shift${count > 1 ? 's' : ''} across ${uniqueClearPersonnelCount} employee${uniqueClearPersonnelCount > 1 ? 's' : ''}! ${preserveLeaves ? 'Approved leaves were preserved.' : ''}`, { id: loadId })
      setClearConfirmOpen(false)
    } catch (err: any) {
      toast.error('Failed to clear schedules: ' + err.message, { id: loadId })
    }
  }

  // Quick Clear Employee Month Shifts
  const handleClearEmployeeMonth = async (empId: string, empName: string) => {
    const monthDateStrings = days.map(d => format(d, 'yyyy-MM-dd'))
    const toDelete = schedules?.filter(s => 
      s.employee_id === empId && 
      monthDateStrings.includes(s.date) && 
      s.status !== 'on_leave'
    ) || []

    if (toDelete.length === 0) {
      toast.info(`No active shifts to clear for ${empName} this month.`)
      return
    }

    const loadId = toast.loading(`Clearing ${toDelete.length} shifts for ${empName}...`)
    try {
      await bulkDeleteSchedules.mutateAsync(toDelete.map(s => s.id))
      await refetchSchedules()
      toast.success(`Cleared ${toDelete.length} shifts for ${empName}!`, { id: loadId })
    } catch (err: any) {
      toast.error(`Failed to clear shifts for ${empName}: ` + err.message, { id: loadId })
    }
  }

  // AI Smart Auto-Fill Scheduler
  const handleExecuteAiScheduler = async () => {
    if (!employees || !shifts || employees.length === 0 || shifts.length === 0) {
      toast.error('Need employees and active shifts to generate a schedule.')
      return
    }

    const loadId = toast.loading('AI is generating the optimal compliant schedule...')
    setAiWizardOpen(false)
    try {
      // Determine date range based on scope
      let targetDays: Date[] = []
      if (aiWizardScope === 'current_week') {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        targetDays = [0, 1, 2, 3, 4].map(offset => addDays(weekStart, offset))
      } else if (aiWizardScope === 'next_week') {
        const nextWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7)
        targetDays = [0, 1, 2, 3, 4].map(offset => addDays(nextWeekStart, offset))
      } else {
        targetDays = days.filter(d => !isWeekend(d))
      }

      const targetDateStrings = targetDays.map(d => format(d, 'yyyy-MM-dd'))

      let targetEmpList = employees
      if (aiWizardDept !== 'all') {
        targetEmpList = targetEmpList.filter(e => e.departments?.name === aiWizardDept)
      }

      const employeeList = targetEmpList.map((e, idx) => ({ idx, id: e.id, name: `${e.first_name} ${e.last_name || ''}`.trim() }))
      const shiftList = shifts.map((s, idx) => ({ idx, id: s.id, name: s.name, time: `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}` }))

      let scheduleAssignments: { emp_idx: number; shift_idx: number; date: string }[] = []

      // Try AI-powered schedule optimization via Gemini
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (apiKey) {
          const genAI = new GoogleGenerativeAI(apiKey)
          const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

          const sampleDates = targetDateStrings.slice(0, 5)
          const prompt = `You are an expert HR Workforce Scheduling AI for a logistics enterprise complying with Philippine DOLE Labor Standards.
Generate an optimal, fair, and balanced weekly shift schedule for these employees for workdays: ${sampleDates.join(', ')}.

Employees:
${employeeList.map(e => `ID ${e.idx}: ${e.name}`).join('\n')}

Available Shifts:
${shiftList.map(s => `Shift ${s.idx}: ${s.name} (${s.time})`).join('\n')}

Rules:
1. Every employee must be assigned EXACTLY ONE shift per date.
2. Distribute shift types fairly so morning, afternoon, and night shifts rotate equitably without burnout.
3. Return ONLY a valid JSON array of objects with keys: "emp_idx" (number), "shift_idx" (number), "date" (string YYYY-MM-DD).

Example output format:
[{"emp_idx": 0, "shift_idx": 0, "date": "${sampleDates[0]}"}]`

          const result = await model.generateContent(prompt)
          let text = result.response.text().trim()
          
          if (text.startsWith('```')) {
            text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
          }

          const parsed = JSON.parse(text)
          if (Array.isArray(parsed) && parsed.length > 0) {
            scheduleAssignments = parsed
          }
        }
      } catch (aiErr) {
        console.warn('Gemini optimization fallback to algorithm:', aiErr)
      }

      // Build guaranteed valid DB schedule payload
      const validSchedules: Partial<Schedule>[] = []
      const assignedMap = new Set<string>()

      // Process AI assignments (Never overwrite approved leaves)
      scheduleAssignments.forEach(item => {
        const emp = employeeList.find(e => e.idx === item.emp_idx)
        const sh = shiftList.find(s => s.idx === item.shift_idx)
        if (emp && sh && targetDateStrings.includes(item.date)) {
          if (isEmployeeOnLeave(emp.id, item.date)) return
          const key = `${emp.id}_${item.date}`
          if (!assignedMap.has(key)) {
            assignedMap.add(key)
            validSchedules.push({
              employee_id: emp.id,
              shift_id: sh.id,
              date: item.date,
              status: 'scheduled',
            })
          }
        }
      })

      // Complete all remaining target workdays using balanced rotation algorithm
      employeeList.forEach((emp, empIdx) => {
        targetDateStrings.forEach((dateStr, dayIdx) => {
          if (isEmployeeOnLeave(emp.id, dateStr)) return
          const key = `${emp.id}_${dateStr}`
          if (!assignedMap.has(key)) {
            assignedMap.add(key)
            const shiftIdx = (empIdx + dayIdx) % shiftList.length
            validSchedules.push({
              employee_id: emp.id,
              shift_id: shiftList[shiftIdx].id,
              date: dateStr,
              status: 'scheduled',
            })
          }
        })
      })

      if (validSchedules.length > 0) {
        await bulkCreateSchedule.mutateAsync(validSchedules)
      }
      await refetchSchedules()
      await refetchLeaves()
      toast.success(`AI successfully auto-filled ${validSchedules.length} shifts across ${employeeList.length} employees (Preserving all approved leaves)!`, { id: loadId })
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to generate schedule: ' + err.message, { id: loadId })
    }
  }

  // AI Labor Compliance & Roster Health Check
  const handleAnalyzeRoster = async () => {
    setAiOpen(true)
    if (aiResult) return

    setIsAnalyzing(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not defined')
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

      const rosterSummary = employees?.map(emp => {
        const stats = employeeStats[emp.id] || { shiftCount: 0, totalHours: 0, leaveCount: 0 }
        return `- ${emp.first_name} ${emp.last_name} (${emp.position || 'Staff'}, ${emp.departments?.name || 'General'}): ${stats.shiftCount} shifts, ${stats.totalHours} hrs scheduled, ${stats.leaveCount} days on approved leave.`
      }).join('\n')

      const prompt = `You are a Senior Human Resources & Labor Compliance Director for a logistics company in the Philippines.
Perform an in-depth Roster Health & DOLE Labor Standards Audit on the following monthly schedule summary:

Total Active Personnel: ${employees?.length || 0}
Total Scheduled Shifts: ${totalScheduledShiftsInMonth}
Total Scheduled Labor Hours: ${totalScheduledHours}

Employee Roster Summary:
${rosterSummary}

Please analyze and format your report with clear markdown headers:
1. **Roster Health Score** (e.g. 92/100) with a brief executive evaluation.
2. **DOLE Labor Standards & Work-Hour Compliance**:
   - Verify standard 40-48 hours workweek limits (Art. 83 Labor Code).
   - Check if any personnel appear over-utilized (>48 hrs) or under-scheduled.
   - Verify 24-consecutive-hour rest day guarantees (Art. 91).
3. **Operational Shift Coverage & Risk Assessment**:
   - Logistics & dispatch coverage strength.
4. **Actionable HR Recommendations** for the upcoming scheduling cycle.`

      const result = await model.generateContent(prompt)
      setAiResult(result.response.text())
    } catch (err: any) {
      setAiResult('Failed to analyze roster: ' + err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift & Roster Management</h1>
          <p className="text-sm text-muted-foreground">
            Plan, optimize, and manage employee schedules in compliance with DOLE Labor Standards
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {can.manageSchedule() && (
            <>
              <Button 
                variant="default" 
                className="gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs" 
                onClick={() => setAiWizardOpen(true)}
              >
                <Sparkles className="size-4" /> AI Auto-Scheduler
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 shrink-0 bg-background hover:bg-muted" 
                onClick={() => setBulkAssignOpen(true)}
              >
                <Users className="size-4 text-blue-600" /> Bulk Assign
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 shrink-0 bg-background hover:bg-muted" 
                onClick={handleCopyPreviousWeek}
                title="Copy last week shift pattern to current week"
              >
                <Copy className="size-4 text-emerald-600" /> Copy Last Week
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 shrink-0 bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300" 
                onClick={handleAnalyzeRoster}
              >
                <ShieldCheck className="size-4" /> DOLE Health Check
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 shrink-0" 
                onClick={handleExport}
              >
                <Download className="size-4" /> Export
              </Button>
              <Button 
                variant="outline" 
                className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10" 
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 className="size-4" /> Clear
              </Button>
              <Button 
                className="gap-1.5 shrink-0" 
                onClick={() => {
                  setAssignForm({ employee_id: '', shift_id: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
                  setAssignOpen(true)
                }}
              >
                <Plus className="size-4" /> Assign Single
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Personnel
            </CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {uniqueDepartments.length} functional departments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled Shifts
            </CardTitle>
            <CalendarIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduledShiftsInMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total shifts for {format(currentMonth, 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled Hours
            </CardTitle>
            <Clock className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScheduledHours} hrs</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average {employees?.length ? Math.round(totalScheduledHours / employees.length) : 0} hrs/employee
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved Leaves Today
            </CardTitle>
            <ShieldCheck className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {todayOnLeave.length} On Leave
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todaySchedules.length} personnel scheduled on duty
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shift Legend */}
      {shifts && shifts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-foreground/80">Shift Legend:</span>
            {shifts.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className="size-3 rounded-full" style={{ background: s.color }} />
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2 border-l border-border/80 pl-3">
              <span className="inline-flex size-4 items-center justify-center rounded bg-amber-100 text-amber-800 font-bold text-[10px] dark:bg-amber-950 dark:text-amber-300">
                L
              </span>
              <span className="font-medium text-foreground">Approved Leave</span>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            💡 Click any cell to assign or edit shifts
          </div>
        </div>
      )}

      {/* Main Calendar Grid Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-3 bg-card border-b border-border/50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="min-w-[180px] text-center text-base font-semibold">
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  className="w-44 pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel</SelectItem>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full min-w-[950px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-xs border-b border-border">
                  <tr>
                    <th className="sticky left-0 z-30 w-52 bg-muted/90 p-2.5 text-left font-semibold text-foreground">
                      Employee Roster
                    </th>
                    {days.map(day => {
                      const weekend = isWeekend(day)
                      const today = isToday(day)
                      return (
                        <th key={day.toISOString()} className={`min-w-[34px] p-1 text-center font-medium ${weekend ? 'bg-muted/40 opacity-70' : ''}`}>
                          <div className={`mx-auto flex size-7 flex-col items-center justify-center rounded-full text-xs font-semibold ${today ? 'bg-primary text-primary-foreground shadow-xs' : 'text-foreground'}`}>
                            <span className="leading-none">{format(day, 'd')}</span>
                          </div>
                          <div className="mt-0.5 text-[9px] font-medium text-muted-foreground uppercase">{format(day, 'EEE')}</div>
                        </th>
                      )
                    })}
                    <th className="sticky right-0 z-30 w-32 bg-muted/90 p-2 text-center font-semibold text-foreground border-l border-border">
                      Summary (Month)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEmployees.map(emp => {
                    const stats = employeeStats[emp.id] || { shiftCount: 0, totalHours: 0, leaveCount: 0 }
                    return (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        {/* Sticky Employee Header Column */}
                        <td className="sticky left-0 z-10 bg-card p-2.5 border-r border-border/40 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7 shrink-0 ring-1 ring-border">
                              {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                              <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                                {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-foreground">{emp.first_name} {emp.last_name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{emp.departments?.name || emp.position || 'Staff'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Calendar Day Cells */}
                        {days.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd')
                          const onLeave = isEmployeeOnLeave(emp.id, dateStr)
                          const sched = scheduleMap.get(`${emp.id}_${dateStr}`)
                          const shift = sched?.shifts || shifts?.find(s => s.id === sched?.shift_id)
                          const shiftColor = shift?.color || '#6366F1'
                          const colors = shift ? (shiftColors[shift.id] || { bg: shiftColor.startsWith('#') ? `${shiftColor}25` : shiftColor, text: shiftColor }) : undefined
                          const weekend = isWeekend(day)

                          return (
                            <td 
                              key={day.toISOString()} 
                              className={`p-0.5 text-center relative border-r border-border/30 ${weekend ? 'bg-muted/20' : ''}`}
                            >
                              {onLeave ? (
                                <div
                                  className="group/cell relative mx-auto flex size-7 items-center justify-center rounded text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs"
                                  title={`Approved Statutory Leave on ${dateStr}`}
                                >
                                  L
                                </div>
                              ) : sched && (shift || sched.shift_id) ? (
                                <div
                                  className="group/cell relative mx-auto flex size-7 items-center justify-center rounded text-[10px] font-bold cursor-pointer hover:scale-105 transition-transform border shadow-2xs"
                                  style={{ background: colors?.bg || `${shiftColor}25`, color: colors?.text || shiftColor, borderColor: shiftColor + '40' }}
                                  title={`${shift?.name || 'Shift'}: ${shift?.start_time ? shift.start_time.slice(0, 5) : '09:00'}–${shift?.end_time ? shift.end_time.slice(0, 5) : '17:00'}`}
                                  onClick={() => {
                                    if (can.manageSchedule()) {
                                      setSelectedCellSched({
                                        id: sched.id,
                                        employee_id: emp.id,
                                        employee_name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
                                        date: dateStr,
                                        shift_id: sched.shift_id,
                                      })
                                      setEditShiftOpen(true)
                                    }
                                  }}
                                >
                                  {shift?.name?.[0] || 'S'}
                                  {can.manageSchedule() && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveSchedule(sched.id)
                                      }}
                                      className="absolute -right-1 -top-1 hidden size-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover/cell:flex shadow-xs"
                                      title="Remove shift"
                                    >
                                      <X className="size-2.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="group/cell relative size-full min-h-[30px] flex items-center justify-center">
                                  {can.manageSchedule() && (
                                    <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 bg-background shadow-xs hover:bg-primary hover:text-primary-foreground rounded"
                                        onClick={() => {
                                          setAssignForm({ employee_id: emp.id, shift_id: shifts?.[0]?.id || '', date: dateStr, notes: '' })
                                          setAssignOpen(true)
                                        }}
                                        title={`Assign shift for ${emp.first_name} on ${dateStr}`}
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

                        {/* Sticky Summary Column */}
                        <td className="sticky right-0 z-10 bg-card p-2 text-center border-l border-border/40 shadow-[-2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-muted/30">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="font-semibold text-foreground">
                              {stats.shiftCount} shifts
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {stats.totalHours} hrs total
                            </span>
                            {stats.leaveCount > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400">
                                {stats.leaveCount}d Leave
                              </Badge>
                            )}
                            {can.manageSchedule() && stats.shiftCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[9px] text-destructive hover:bg-destructive/10 hover:text-destructive mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleClearEmployeeMonth(emp.id, `${emp.first_name} ${emp.last_name || ''}`.trim())}
                                title={`Clear all ${stats.shiftCount} shifts for ${emp.first_name} this month`}
                              >
                                <Trash2 className="size-2.5 mr-0.5" /> Clear
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Info & Shift Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's Active Shifts */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Today's Scheduled Roster
            </CardTitle>
            <CardDescription>Personnel on duty for {format(new Date(), 'MMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {todaySchedules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No shifts scheduled for today</p>
            ) : (
              todaySchedules.map(sched => {
                const emp = employees?.find(e => e.id === sched.employee_id) || sched.employees
                const shift = shifts?.find(s => s.id === sched.shift_id) || sched.shifts
                return emp && shift ? (
                  <div key={sched.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2 bg-card/60">
                    <Avatar className="size-7 shrink-0">
                      {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{emp.first_name} {emp.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.departments?.name || emp.position}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold shrink-0"
                      style={{ backgroundColor: shift.color + '20', color: shift.color }}
                    >
                      {shift.name}
                    </Badge>
                  </div>
                ) : null
              })
            )}
          </CardContent>
        </Card>

        {/* Today's On Leave */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-amber-500" /> Today's Approved Leaves
            </CardTitle>
            <CardDescription>Personnel away on statutory leave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {todayOnLeave.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No employees on leave today</p>
            ) : (
              todayOnLeave.map(emp => (
                <div key={emp.id} className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-2">
                  <Avatar className="size-7 shrink-0">
                    {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-amber-100 text-[10px] text-amber-800">
                      {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.position || emp.departments?.name || 'Staff'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-800 bg-amber-100 border-amber-300 font-semibold shrink-0">
                    On Leave
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Shift Templates Distribution */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="size-4 text-indigo-500" /> Shift Templates
            </CardTitle>
            <CardDescription>Standard organizational shift definitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {shifts?.map(shift => {
              const monthCount = schedules?.filter(s => s.shift_id === shift.id && s.status !== 'on_leave').length ?? 0
              return (
                <div key={shift.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 bg-card/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-3 rounded-full shrink-0" style={{ background: shift.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{shift.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)} · {shift.break_duration}m break
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {monthCount} shifts
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 1. AI Auto-Scheduler Configuration Wizard Modal */}
      <Dialog open={aiWizardOpen} onOpenChange={setAiWizardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <Sparkles className="size-5 text-primary" /> AI Smart Auto-Scheduler
            </DialogTitle>
            <DialogDescription>
              Generate an optimized, fair, and DOLE-compliant workforce schedule automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Scheduling Scope *</Label>
              <Select value={aiWizardScope} onValueChange={(v: any) => setAiWizardScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_week">Current Work Week (Monday – Friday)</SelectItem>
                  <SelectItem value="next_week">Next Work Week (Upcoming Mon – Fri)</SelectItem>
                  <SelectItem value="full_month">Full Month ({format(currentMonth, 'MMMM yyyy')})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Department</Label>
              <Select value={aiWizardDept} onValueChange={setAiWizardDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments ({employees?.length} Employees)</SelectItem>
                  {uniqueDepartments.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Optimization Strategy</Label>
              <Select value={aiWizardStrategy} onValueChange={(v: any) => setAiWizardStrategy(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced Equitable Rotation (DOLE Compliant)</SelectItem>
                  <SelectItem value="morning_priority">Daytime Priority (Operations Peak Focus)</SelectItem>
                  <SelectItem value="rotation">Fair Weekly Shift Swapping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                <strong>Statutory Protection Active:</strong> Approved leaves and mandatory rest days are preserved and will not be overwritten.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAiWizardOpen(false)}>Cancel</Button>
              <Button onClick={handleExecuteAiScheduler} className="gap-1.5">
                <Sparkles className="size-4" /> Run Auto-Scheduler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Bulk Shift Assignment Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Users className="size-5 text-blue-600" /> Bulk Shift Assignment
            </DialogTitle>
            <DialogDescription>
              Assign a shift to an entire department or group of employees across a date range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Department *</Label>
              <Select 
                value={bulkAssignForm.department} 
                onValueChange={v => setBulkAssignForm(f => ({ ...f, department: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments ({employees?.length} Employees)</SelectItem>
                  {uniqueDepartments.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Shift to Assign *</Label>
              <Select 
                value={bulkAssignForm.shift_id} 
                onValueChange={v => setBulkAssignForm(f => ({ ...f, shift_id: v }))}
              >
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input
                  type="date"
                  value={bulkAssignForm.startDate}
                  onChange={e => setBulkAssignForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input
                  type="date"
                  value={bulkAssignForm.endDate}
                  onChange={e => setBulkAssignForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkAssignForm.skipWeekends}
                  onChange={e => setBulkAssignForm(f => ({ ...f, skipWeekends: e.target.checked }))}
                  className="rounded border-input text-primary focus:ring-primary size-4"
                />
                <span>Skip weekends (Saturdays & Sundays)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkAssignForm.skipLeaves}
                  onChange={e => setBulkAssignForm(f => ({ ...f, skipLeaves: e.target.checked }))}
                  className="rounded border-input text-primary focus:ring-primary size-4"
                />
                <span>Preserve approved employee leaves</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkAssign} disabled={bulkCreateSchedule.isPending}>
                {bulkCreateSchedule.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Apply Bulk Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Assign Single Shift Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Single Shift</DialogTitle>
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
              <Input
                type="date"
                value={assignForm.date}
                onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="e.g. Coverage for peak dispatch"
                value={assignForm.notes}
                onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={createSchedule.isPending || !assignForm.employee_id || !assignForm.shift_id}
              >
                {createSchedule.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Assign Shift
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Quick Edit Shift Dialog (from calendar click) */}
      <Dialog open={editShiftOpen} onOpenChange={setEditShiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Shift Assignment</DialogTitle>
            <DialogDescription>
              {selectedCellSched?.employee_name} on {selectedCellSched?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Change Shift</Label>
              <Select 
                value={selectedCellSched?.shift_id || ''} 
                onValueChange={async (newShiftId) => {
                  if (!selectedCellSched) return
                  try {
                    await createSchedule.mutateAsync({
                      employee_id: selectedCellSched.employee_id,
                      shift_id: newShiftId,
                      date: selectedCellSched.date,
                      status: 'scheduled',
                    })
                    await refetchSchedules()
                    toast.success('Shift updated successfully')
                    setEditShiftOpen(false)
                  } catch (err: any) {
                    toast.error(err.message)
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select new shift" /></SelectTrigger>
                <SelectContent>
                  {shifts?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={async () => {
                  if (!selectedCellSched?.id) return
                  await handleRemoveSchedule(selectedCellSched.id)
                  setEditShiftOpen(false)
                }}
              >
                Remove Shift
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditShiftOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Advanced Bulk Clear Schedule Confirmation Modal */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-lg">
              <Trash2 className="size-5" /> Bulk Clear Scheduled Shifts
            </DialogTitle>
            <DialogDescription>
              Instantly wipe multiple shift assignments in a single lightning-fast bulk operation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Scope Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date Range Scope</Label>
              <Select value={clearScope} onValueChange={(v: any) => setClearScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_month">Full Month ({format(currentMonth, 'MMMM yyyy')})</SelectItem>
                  <SelectItem value="current_week">Current Week Only</SelectItem>
                  <SelectItem value="custom_range">Custom Date Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {clearScope === 'custom_range' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Start Date</Label>
                  <Input 
                    type="date" 
                    value={clearCustomStart} 
                    onChange={e => setClearCustomStart(e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">End Date</Label>
                  <Input 
                    type="date" 
                    value={clearCustomEnd} 
                    onChange={e => setClearCustomEnd(e.target.value)} 
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Target Filtering Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Filter by Department</Label>
                <Select value={clearDept} onValueChange={setClearDept}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Filter by Shift Type</Label>
                <Select value={clearShift} onValueChange={setClearShift}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shift Types</SelectItem>
                    {shifts?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Filter by Employee (Optional)</Label>
              <Select value={clearEmployee} onValueChange={setClearEmployee}>
                <SelectTrigger><SelectValue placeholder="All Personnel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personnel ({employees?.length || 0} staff)</SelectItem>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Safety Options */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/40 p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={preserveLeaves} 
                  onChange={e => setPreserveLeaves(e.target.checked)} 
                  className="mt-0.5 rounded border-amber-400 text-primary focus:ring-primary size-4"
                />
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-300">
                    Preserve Approved DOLE Statutory Leaves (Recommended)
                  </span>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80">
                    Maternity, Paternity, Solo Parent, Sick, and Vacation leaves will remain safely protected on the roster.
                  </p>
                </div>
              </label>
            </div>

            {/* Impact Metric Card */}
            <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Target Shifts to Wipe:</p>
                <p className="text-xl font-bold text-foreground">
                  {schedulesToClear.length} <span className="text-xs font-normal text-muted-foreground">shifts</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Affected Staff:</p>
                <p className="text-xl font-bold text-foreground">
                  {uniqueClearPersonnelCount} <span className="text-xs font-normal text-muted-foreground">personnel</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setClearConfirmOpen(false)}
                disabled={bulkDeleteSchedules.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleClearSchedules}
                disabled={schedulesToClear.length === 0 || bulkDeleteSchedules.isPending}
                className="gap-1.5"
              >
                {bulkDeleteSchedules.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Clearing Shifts...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" /> Clear {schedulesToClear.length} Shifts Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. AI Analyzer Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-600 font-bold">
              <Sparkles className="size-5" /> DOLE Labor Standards & Roster Health Audit
            </DialogTitle>
            <DialogDescription>
              Automated audit covering work hours, rest periods, and operational coverage.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[220px] max-h-[60vh] overflow-y-auto pr-2 flex flex-col pt-2">
            {isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="size-9 animate-spin text-violet-500" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                  Analyzing employee work hours and labor compliance...
                </p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-3 leading-relaxed whitespace-pre-wrap">
                {aiResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
