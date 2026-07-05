import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PerformanceReview } from '@/types'

export function usePerformanceReviews(employeeId?: string) {
  return useQuery({
    queryKey: ['performance-reviews', employeeId],
    queryFn: async () => {
      let q = supabase
        .from('performance_reviews')
        .select('*, employees!performance_reviews_employee_id_fkey(id, first_name, last_name, avatar_url, position, departments(name)), reviewer:employees!performance_reviews_reviewer_id_fkey(id, first_name, last_name)')
        .order('created_at', { ascending: false })
      if (employeeId) q = q.eq('employee_id', employeeId)
      const { data, error } = await q
      if (error) throw error
      return data as PerformanceReview[]
    },
  })
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (review: Partial<PerformanceReview>) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert(review)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-reviews'] }),
  })
}

export function useUpdatePerformanceReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance-reviews'] }),
  })
}
