import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, ORG_ID } from '@/lib/supabase'
import { format } from 'date-fns'
import type { Shift, Schedule } from '@/types'

export function useShifts() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('org_id', ORG_ID)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Shift[]
    },
  })
}

export function useSchedules(startDate: string, endDate: string, employeeId?: string) {
  return useQuery({
    queryKey: ['schedules', startDate, endDate, employeeId],
    queryFn: async () => {
      let q = supabase
        .from('schedules')
        .select('*, employees(id, first_name, last_name, position, departments(name)), shifts(*)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (employeeId) q = q.eq('employee_id', employeeId)
      const { data, error } = await q
      if (error) throw error
      return data as Schedule[]
    },
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (schedule: Partial<Schedule>) => {
      const { data, error } = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Schedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}
