import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, Employee } from '@/types'
import { supabase, ORG_ID } from '@/lib/supabase'

interface AuthState {
  user: AuthUser | null
  employee: Employee | null
  isLoading: boolean
  isAuthenticated: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  setEmployee: (employee: Employee) => void
  updateProfile: (updates: Partial<Employee>) => Promise<{ error?: string }>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      employee: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        set({ isLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: emp } = await supabase
              .from('employees')
              .select('*, departments(*)')
              .eq('user_id', session.user.id)
              .maybeSingle()

            set({
              user: { id: session.user.id, email: session.user.email!, employee: emp ?? undefined },
              employee: emp,
              isAuthenticated: true,
            })
          } else {
            set({ user: null, employee: null, isAuthenticated: false })
          }
        } catch {
          set({ user: null, employee: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }

        if (data.user) {
          let { data: emp } = await supabase
            .from('employees')
            .select('*, departments(*)')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (!emp) {
            // First check if there's a seeded employee with this email
            const { data: existingSeeded } = await supabase
              .from('employees')
              .select('*')
              .eq('email', data.user.email)
              .is('user_id', null)
              .maybeSingle()

            if (existingSeeded) {
              const { data: updatedEmp } = await supabase
                .from('employees')
                .update({ user_id: data.user.id })
                .eq('id', existingSeeded.id)
                .select('*, departments(*)')
                .single()
              if (updatedEmp) emp = updatedEmp
            }

            // If there's an existing employee linked but somehow maybeSingle failed earlier (duplicates),
            // let's grab the admin one if it exists
            if (!emp) {
                const { data: allUserEmps } = await supabase
                  .from('employees')
                  .select('*, departments(*)')
                  .eq('email', data.user.email)
                
                if (allUserEmps && allUserEmps.length > 0) {
                    // Prefer super_admin or admin
                    emp = allUserEmps.find(e => e.role === 'super_admin' || e.role === 'admin') || allUserEmps[0]
                    // Fix the user_id if it's null
                    if (emp && emp.user_id !== data.user.id) {
                        await supabase.from('employees').update({ user_id: data.user.id }).eq('id', emp.id)
                    }
                }
            }

            // If still no employee found, create a brand new one
            if (!emp) {
              const firstName = data.user.user_metadata?.first_name || data.user.email?.split('@')[0] || 'User'
              const lastName = data.user.user_metadata?.last_name || ''
              
              const { data: newEmp, error: insertError } = await supabase
                .from('employees')
                .insert({
                  user_id: data.user.id,
                  org_id: ORG_ID,
                  first_name: firstName,
                  last_name: lastName,
                  email: data.user.email!,
                  role: 'employee',
                })
                .select('*, departments(*)')
                .single()

              if (insertError) return { error: insertError.message }
              emp = newEmp
            }
          }

          set({
            user: { id: data.user.id, email: data.user.email!, employee: emp ?? undefined },
            employee: emp,
            isAuthenticated: true,
          })
        }
        return {}
      },

      signUp: async (email, password, firstName, lastName) => {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        })
        if (error) return { error: error.message }

        if (data.user) {
          // If email confirmation is required, session will be null
          if (!data.session) {
            return {} // Return success but don't log in
          }

          const { data: emp, error: insertError } = await supabase
            .from('employees')
            .insert({
              user_id: data.user.id,
              org_id: ORG_ID,
              first_name: firstName,
              last_name: lastName,
              email,
              role: 'employee',
              employee_id: `EMP-${Date.now().toString().slice(-4)}`,
            })
            .select('*, departments(*)')
            .single()

          if (insertError) return { error: insertError.message }

          set({
            user: { id: data.user.id, email: data.user.email!, employee: emp ?? undefined },
            employee: emp,
            isAuthenticated: true,
          })
        }
        return {}
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, employee: null, isAuthenticated: false })
      },

      setEmployee: (employee) => {
        set({ employee })
        const { user } = get()
        if (user) set({ user: { ...user, employee } })
      },

      updateProfile: async (updates) => {
        const { employee } = get()
        if (!employee) return { error: 'Not authenticated' }
        const { data, error } = await supabase
          .from('employees')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', employee.id)
          .select('*, departments(*)')
          .single()
        if (error) return { error: error.message }
        set({ employee: data })
        const { user } = get()
        if (user) set({ user: { ...user, employee: data } })
        return {}
      },

      updatePassword: async (_currentPassword, newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) return { error: error.message }
        return {}
      },
    }),
    {
      name: 'wms-auth',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)
