import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Search, RefreshCw, MoreVertical, UserX, UserCheck, KeySquare, Trash2, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSystemUsers, useManageSystemUser, type SystemUser } from '@/hooks/use-users'
import { useEmployees } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth.store'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

export default function SystemUsersPage() {
  const { data: authUsers, isLoading: isLoadingAuth, refetch, error: queryError } = useSystemUsers()
  const { data: employees, isLoading: isLoadingEmp } = useEmployees()
  const { mutateAsync: manageUser, isPending } = useManageSystemUser()
  const { can } = usePermissions()
  const currentUser = useAuthStore(s => s.employee)

  const [search, setSearch] = useState('')
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'password' | 'suspend' | 'unsuspend' | 'delete' | null;
    user: SystemUser | null;
  }>({ open: false, type: null, user: null })
  const [newPassword, setNewPassword] = useState('')

  const isLoading = isLoadingAuth || isLoadingEmp

  const combinedUsers = useMemo(() => {
    if (!authUsers) return []
    return authUsers.map(au => {
      const emp = employees?.find(e => e.user_id === au.id)
      return {
        ...au,
        employee: emp
      }
    }).filter(u => {
      const term = search.toLowerCase()
      return (u.email || '').toLowerCase().includes(term) ||
        (u.employee?.first_name?.toLowerCase() || '').includes(term) ||
        (u.employee?.last_name?.toLowerCase() || '').includes(term)
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [authUsers, employees, search])

  const handleAction = async () => {
    const { type, user } = actionDialog
    if (!type || !user) return

    try {
      if (type === 'password') {
        if (newPassword.length < 8) {
          toast.error('Password must be at least 8 characters')
          return
        }
        await manageUser({ action: 'update_password', userId: user.id, newPassword })
        toast.success('Password updated successfully')
      } else {
        await manageUser({ action: type, userId: user.id })
        toast.success(`User ${type === 'delete' ? 'deleted' : type === 'suspend' ? 'suspended' : 'unsuspended'} successfully`)
      }
      setActionDialog({ open: false, type: null, user: null })
      setNewPassword('')
      refetch()
    } catch (err: any) {
      toast.error(`Failed to ${type} user`, { description: err.message })
    }
  }

  const getInitials = (first?: string, last?: string) => {
    return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'U'
  }

  if (!can.manageSettings() && currentUser?.role !== 'super_admin') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <ShieldAlert className="size-16 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-sm">
          You do not have permission to view or manage system users. This area is restricted to Super Admins.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="size-6 text-primary" />
            System Users Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage raw authentication accounts, reset passwords, and enforce access controls.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">System Role</th>
                <th className="px-4 py-3 font-medium">Auth Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queryError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-destructive bg-destructive/5 font-medium">
                    Error loading users: {queryError.message}
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : combinedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                combinedUsers.map((user, i) => {
                  const isBanned = !!user.banned_until
                  const roleLabel = user.employee?.role ? user.employee.role.replace('_', ' ').toUpperCase() : 'NO ROLE'
                  
                  return (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium text-xs">
                              {getInitials(user.employee?.first_name, user.employee?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.employee ? `${user.employee.first_name} ${user.employee.last_name || ''}` : 'Unlinked Account'}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Mail className="size-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.employee?.role === 'super_admin' ? 'default' : 'secondary'} className="text-[10px]">
                          {roleLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {isBanned ? (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>
                        ) : user.email_confirmed_at ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">Unverified</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          {user.last_sign_in_at ? (
                            <>
                              <p>{format(new Date(user.last_sign_in_at), 'MMM d, yyyy')}</p>
                              <p className="text-muted-foreground">{format(new Date(user.last_sign_in_at), 'h:mm a')}</p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'password', user })}>
                              <KeySquare className="mr-2 size-4" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isBanned ? (
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'unsuspend', user })}>
                                <UserCheck className="mr-2 size-4 text-emerald-500" /> Unsuspend Auth
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'suspend', user })}>
                                <UserX className="mr-2 size-4 text-amber-500" /> Suspend Auth
                              </DropdownMenuItem>
                            )}
                            {currentUser?.user_id !== user.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setActionDialog({ open: true, type: 'delete', user })} className="text-destructive">
                                  <Trash2 className="mr-2 size-4" /> Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: null, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'password' && 'Reset Password'}
              {actionDialog.type === 'suspend' && 'Suspend User'}
              {actionDialog.type === 'unsuspend' && 'Unsuspend User'}
              {actionDialog.type === 'delete' && 'Delete User'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'password' && `Force a new password for ${actionDialog.user?.email}.`}
              {actionDialog.type === 'suspend' && `This will immediately revoke ${actionDialog.user?.email}'s ability to log in.`}
              {actionDialog.type === 'unsuspend' && `This will restore login access for ${actionDialog.user?.email}.`}
              {actionDialog.type === 'delete' && (
                <span className="text-destructive font-semibold">
                  Warning: This will permanently delete the auth account and the associated employee record for {actionDialog.user?.email}. This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'password' && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <Input 
                  type="text" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null, user: null })} disabled={isPending}>
              Cancel
            </Button>
            <Button 
              variant={actionDialog.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isPending}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
