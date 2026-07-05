import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import type { TimesheetEntry, TimesheetPeriod } from '@/types'

export function useTimesheetEntries(employeeId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['timesheet-entries', employeeId, startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from('timesheet_entries')
        .select('*, employees(id, first_name, last_name, position, departments(name))')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (employeeId) {
        q = q.eq('employee_id', employeeId)
      }

      const { data, error } = await q
      if (error) throw error
      return data as TimesheetEntry[]
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useTimesheetPeriods(orgId: string) {
  return useQuery({
    queryKey: ['timesheet-periods', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheet_periods')
        .select('*')
        .eq('org_id', orgId)
        .order('start_date', { ascending: false })
        .limit(12)
      if (error) throw error
      return data as TimesheetPeriod[]
    },
    enabled: !!orgId,
  })
}

export function useCreateTimesheetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Partial<TimesheetEntry>) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert(entry)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-entries'] }),
  })
}

export function useUpdateTimesheetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimesheetEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-entries'] }),
  })
}

export function useDeleteTimesheetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-entries'] }),
  })
}

export function useApproveTimesheetEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({
          is_approved: true,
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-entries'] }),
  })
}

export function useBulkApproveTimesheetEntries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, approvedBy }: { ids: string[]; approvedBy: string }) => {
      const { error } = await supabase
        .from('timesheet_entries')
        .update({
          is_approved: true,
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-entries'] }),
  })
}

// Utility function to get the current week's date range
export function getWeekRange(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}
