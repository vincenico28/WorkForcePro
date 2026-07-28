import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AuditLog {
  id: string
  user_id: string
  employee_id: string
  action: string
  resource_type: string
  resource_id: string
  changes: any
  ip_address: string
  user_agent: string
  created_at: string
  users?: { email: string }
  employees?: { first_name: string; last_name: string }
}

export function useAuditLogs(
  page: number = 1,
  pageSize: number = 50,
  actionFilter?: string,
  resourceFilter?: string
) {
  return useQuery({
    queryKey: ['audit_logs', page, pageSize, actionFilter, resourceFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select(`
          *,
          employees:employee_id(first_name, last_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (actionFilter && actionFilter !== 'all') {
        q = q.eq('action', actionFilter)
      }
      
      if (resourceFilter && resourceFilter !== 'all') {
        q = q.eq('resource_type', resourceFilter)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      q = q.range(from, to)

      const { data, error, count } = await q

      if (error) throw error
      return { data: data as AuditLog[], count }
    },
  })
}
