import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AttendanceRecord } from '@/types'
import { format } from 'date-fns'

import { useAuthStore } from '@/stores/auth.store'

export function useAttendance(date?: Date) {
  const { employee } = useAuthStore()
  const dateStr = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['attendance', dateStr],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, employees:employees!attendance_records_employee_id_fkey(id, first_name, last_name, avatar_url, position, departments(name))')
        .eq('date', dateStr)
        .order('clock_in', { ascending: false })

      if (employee?.role === 'employee') {
        query = query.eq('employee_id', employee.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AttendanceRecord[]
    },
  })
}

export function useAttendanceRange(startDate: string, endDate: string) {
  const { employee } = useAuthStore()
  return useQuery({
    queryKey: ['attendance', 'range', startDate, endDate, employee?.id],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select('*, employees:employees!attendance_records_employee_id_fkey(id, first_name, last_name, avatar_url, departments(name))')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (employee?.role === 'employee') {
        query = query.eq('employee_id', employee.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AttendanceRecord[]
    },
  })
}

export function useEmployeeAttendance(employeeId: string, limit = 30) {
  return useQuery({
    queryKey: ['attendance', 'employee', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as AttendanceRecord[]
    },
    enabled: !!employeeId,
  })
}

export function useClockIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const now = new Date().toISOString()
      
      const { data: schedule } = await supabase
        .from('schedules')
        .select('*, shifts(*)')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle()

      let status = 'present'
      if (schedule?.shifts && !Array.isArray(schedule.shifts) && schedule.shifts.start_time) {
        const [shiftHour, shiftMinute] = schedule.shifts.start_time.split(':').map(Number)
        const currentHour = new Date().getHours()
        const currentMinute = new Date().getMinutes()
        
        let shiftTimeMinutes = (shiftHour * 60) + shiftMinute
        let currentTimeMinutes = (currentHour * 60) + currentMinute
        
        if (schedule.shifts.is_overnight && currentHour < 12) {
           currentTimeMinutes += 24 * 60
        }
        
        if (currentTimeMinutes > shiftTimeMinutes) {
          status = 'late'
        }
      } else {
        const clockInHour = new Date().getHours()
        status = clockInHour > 9 ? 'late' : 'present'
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employeeId,
          date: today,
          clock_in: now,
          status,
        }, { onConflict: 'employee_id,date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

export function useClockOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ employeeId, attendanceId }: { employeeId: string; attendanceId: string }) => {
      const now = new Date()
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('clock_in, date')
        .eq('id', attendanceId)
        .single()

      let totalHours = 0
      if (existing?.clock_in) {
        const diff = now.getTime() - new Date(existing.clock_in).getTime()
        totalHours = parseFloat((diff / 3600000 - 1).toFixed(2))
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          clock_out: now.toISOString(),
          total_hours: totalHours,
          overtime_hours: Math.max(0, totalHours - 8),
          updated_at: now.toISOString(),
        })
        .eq('id', attendanceId)
        .select()
        .single()
      if (error) throw error

      if (existing?.clock_in && existing?.date) {
        const { error: tsError } = await supabase
          .from('timesheet_entries')
          .insert({
            employee_id: employeeId,
            date: existing.date,
            start_time: format(new Date(existing.clock_in), 'HH:mm:ss'),
            end_time: format(now, 'HH:mm:ss'),
            break_minutes: 60,
            source: 'clock_in',
            attendance_id: attendanceId,
            is_approved: false
          })
        if (tsError) console.error('Failed to auto-generate timesheet', tsError)
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['timesheets'] })
    },
  })
}

export function useTodayAttendance(employeeId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['attendance', 'today', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle()
      return data as AttendanceRecord | null
    },
    enabled: !!employeeId,
  })
}
