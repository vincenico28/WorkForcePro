import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, ORG_ID } from '@/lib/supabase'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization', ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', ORG_ID)
        .single()
      
      if (error) throw error
      return data as Organization
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Organization>) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', ORG_ID)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization', ORG_ID] })
    },
  })
}
