import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SystemUser = {
  id: string
  email: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  created_at: string
  banned_until?: string
}

export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      })
      console.log('manage-users list result:', { data, error })
      if (error) {
        throw new Error(error.message || `Invoke error: ${JSON.stringify(error)}`)
      }
      if (data?.error) {
        throw new Error(typeof data.error === 'string' ? data.error : `Data error: ${JSON.stringify(data.error)}`)
      }
      return data?.users as SystemUser[]
    },
  })
}

export function useManageSystemUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ action, userId, newPassword }: { action: 'update_password' | 'suspend' | 'unsuspend' | 'delete', userId: string, newPassword?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action, userId, newPassword }
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-users'] })
      // If we deleted a user, their employee record is gone too, so invalidate employees
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
