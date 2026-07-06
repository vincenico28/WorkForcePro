import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, ORG_ID } from '@/lib/supabase'
import type { LeaveRequest, LeaveType, LeaveBalance } from '@/types'

import { useAuthStore } from '@/stores/auth.store'

export function useLeaveRequests(status?: string) {
  const { employee } = useAuthStore()
  return useQuery({
    queryKey: ['leaves', status, employee?.id],
    queryFn: async () => {
      let q = supabase
        .from('leave_requests')
        .select('*, employees!leave_requests_employee_id_fkey(id, first_name, last_name, avatar_url, position, departments(name)), leave_types(*)')
        .order('created_at', { ascending: false })
      if (status && status !== 'all') q = q.eq('status', status)
      
      if (employee?.role === 'employee') {
        q = q.eq('employee_id', employee.id)
      }

      const { data, error } = await q
      if (error) throw error
      return data as LeaveRequest[]
    },
  })
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('org_id', ORG_ID)
        .eq('is_active', true)
      if (error) throw error
      return data as LeaveType[]
    },
  })
}

export function useLeaveBalances(employeeId: string) {
  return useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, leave_types(*)')
        .eq('employee_id', employeeId)
        .eq('year', new Date().getFullYear())
      if (error) throw error
      return data as LeaveBalance[]
    },
    enabled: !!employeeId,
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: Partial<LeaveRequest>) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert(req)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, review_notes, reviewed_by }: {
      id: string; status: string; review_notes?: string; reviewed_by?: string
    }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status,
          review_notes,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  })
}
