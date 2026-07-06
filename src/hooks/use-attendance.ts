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
      const clockInHour = new Date().getHours()
      const status = clockInHour > 9 ? 'late' : 'present'

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
        .select('clock_in')
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
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
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
