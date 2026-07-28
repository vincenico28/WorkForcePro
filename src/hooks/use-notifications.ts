import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Notification } from '@/types'
import { useEffect } from 'react'

export function useNotifications() {
  const { employee } = useAuthStore()
  const qc = useQueryClient()

  // Realtime subscription
  useEffect(() => {
    if (!employee) return

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `employee_id=eq.${employee.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['notifications', employee.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employee, qc])

  return useQuery({
    queryKey: ['notifications', employee?.id],
    queryFn: async () => {
      if (!employee) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Notification[]
    },
    enabled: !!employee,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const { employee } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', employee?.id] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const { employee } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!employee) return
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('employee_id', employee.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', employee?.id] }),
  })
}
