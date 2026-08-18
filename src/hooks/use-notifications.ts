import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { playNotificationSound } from '@/utils/notification-sound'
import type { Notification } from '@/types'
import { useEffect, useRef } from 'react'

export function useNotifications() {
  const { employee } = useAuthStore()
  const qc = useQueryClient()
  const previousLatestIdRef = useRef<string | null>(null)
  const isInitialLoadRef = useRef(true)

  // Realtime subscription with sound chime
  useEffect(() => {
    if (!employee) return

    const channel = supabase
      .channel(`public:notifications:${employee.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `employee_id=eq.${employee.id}` },
        () => {
          // Play ring bell audio chime automatically on realtime push
          playNotificationSound()
          qc.invalidateQueries({ queryKey: ['notifications', employee.id] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `employee_id=eq.${employee.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['notifications', employee.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employee, qc])

  const query = useQuery({
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
    refetchInterval: 10000, // Poll every 10s as background fallback
  })

  // Detect new unread notification arriving from query refetch
  useEffect(() => {
    if (!query.data || query.data.length === 0) return

    const latest = query.data[0]
    if (isInitialLoadRef.current) {
      previousLatestIdRef.current = latest.id
      isInitialLoadRef.current = false
      return
    }

    if (previousLatestIdRef.current && latest.id !== previousLatestIdRef.current && !latest.is_read) {
      // New notification arrived! Play chime automatically
      playNotificationSound()
    }
    previousLatestIdRef.current = latest.id
  }, [query.data])

  return query
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
