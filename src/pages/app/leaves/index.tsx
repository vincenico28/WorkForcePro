import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Calendar, CheckCircle, XCircle, Clock, Plus, Filter, Download,
  ChevronRight, Loader2, Search
} from 'lucide-react'
import { useLeaveRequests, useLeaveTypes, useLeaveBalances, useCreateLeaveRequest, useUpdateLeaveStatus } from '@/hooks/use-leaves'
import { useEmployees } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { LeaveRequest } from '@/types'

const STATUS_CONFIG: Record<string, { className: string; label: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: XCircle },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: XCircle },
}

function RequestLeaveDialog() {
  const { employee } = useAuthStore()
  const { data: leaveTypes } = useLeaveTypes()
  const { mutateAsync, isPending } = useCreateLeaveRequest()
  const { data: employees } = useEmployees()
  const { can } = usePermissions()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    employee_id: employee?.id ?? '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  const update = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      if (k === 'start_date' && (!p.end_date || new Date(v) > new Date(p.end_date))) {
        next.end_date = v
      }
      return next
    })
  }

  const calcDays = () => {
    if (!form.start_date || !form.end_date) return 0
    const s = new Date(form.start_date), e = new Date(form.end_date)
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return Math.max(0, diff)
  }

  const { data: balances } = useLeaveBalances(form.employee_id)
  const selectedType = leaveTypes?.find(lt => lt.id === form.leave_type_id)
  const isSickLeave = selectedType?.name.toLowerCase().includes('sick')
  const bal = balances?.find(b => b.leave_type_id === form.leave_type_id)
  const allocated = bal?.allocated_days ?? selectedType?.days_allowed ?? 0
  const used = bal?.used_days ?? 0
  const remaining = Math.max(0, allocated - used)
  const requestedDays = calcDays()
  const projectedRemaining = Math.max(0, remaining - requestedDays)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const days = calcDays()
    if (days <= 0) { toast.error('End date must be after start date'); return }
    if (requestedDays > remaining) { toast.error('Insufficient leave balance'); return }
    try {
      await mutateAsync({ ...form, total_days: days, status: 'pending' })
      toast.success('Leave request submitted!', { description: 'Your request is pending approval.' })
      setOpen(false)
    } catch (err: any) {
      toast.error('Failed to submit request', { description: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Request Leave
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {can.manageLeaves() && (
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={v => update('employee_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Leave Type *</Label>
            <Select value={form.leave_type_id} onValueChange={v => update('leave_type_id', v)} required>
              <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {leaveTypes?.map(lt => (
                  <SelectItem key={lt.id} value={lt.id}>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ background: lt.color }} />
                      {lt.name} ({lt.days_allowed} days/yr)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => update('end_date', e.target.value)}
                required
                min={form.start_date || format(new Date(), 'yyyy-MM-dd')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          {calcDays() > 0 && selectedType && (
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-sm flex justify-between items-center">
              <div>
                <span className="font-medium text-primary">{requestedDays} working day{requestedDays !== 1 ? 's' : ''}</span>
                <span className="text-muted-foreground"> requested</span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-xs block">Projected Balance:</span>
                <span className={`font-semibold ${projectedRemaining < 0 ? 'text-red-500' : 'text-primary'}`}>
                  {projectedRemaining} days
                </span>
              </div>
            </div>
          )}
          {isSickLeave && (
            <div className="space-y-1.5">
              <Label>Medical Certificate *</Label>
              <input
                type="file"
                required
                accept="image/*,.pdf"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:mr-4 file:px-3 file:py-1 file:rounded-md shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">Required for Sick Leave (PDF, JPG, PNG)</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={form.reason}
              onChange={e => update('reason', e.target.value)}
              placeholder="Optional: describe the reason for your leave..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.leave_type_id || !form.start_date || !form.end_date}>
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Submitting...</> : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LeaveCard({ leave, onAction }: { leave: LeaveRequest; onAction?: (id: string, status: string) => void }) {
  const { can } = usePermissions()
  const cfg = STATUS_CONFIG[leave.status]
  const Icon = cfg?.icon ?? Clock

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {`${leave.employees?.first_name?.[0] ?? ''}${leave.employees?.last_name?.[0] ?? ''}`}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">
                {leave.employees?.first_name} {leave.employees?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{leave.employees?.position}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg?.className}`}>
            <Icon className="size-3" />
            {cfg?.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{leave.leave_types?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{leave.total_days} day{leave.total_days !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dates</p>
            <p className="font-medium">
              {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d')}
            </p>
          </div>
        </div>

        {leave.reason && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">"{leave.reason}"</p>
        )}

        {leave.status === 'pending' && onAction && can.approveLeaves() && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400"
              onClick={() => onAction(leave.id, 'rejected')}
            >
              <XCircle className="mr-1.5 size-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAction(leave.id, 'approved')}
            >
              <CheckCircle className="mr-1.5 size-3.5" />
              Approve
            </Button>
          </div>
        )}

        <p className="mt-2 text-right text-[10px] text-muted-foreground">
          Submitted {format(new Date(leave.created_at), 'MMM d, h:mm a')}
        </p>
      </CardContent>
    </Card>
  )
}

export default function LeavesPage() {
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ id: string, status: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { employee } = useAuthStore()
  const { data: leaves, isLoading } = useLeaveRequests(activeTab)
  const { mutateAsync: updateStatus } = useUpdateLeaveStatus()
  const { data: leaveTypes } = useLeaveTypes()
  const { data: balances } = useLeaveBalances(employee?.id ?? '')

  const filteredLeaves = leaves?.filter(l => {
    const matchesCategory = !selectedCategory || l.leave_type_id === selectedCategory
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      l.employees?.first_name?.toLowerCase().includes(searchLower) ||
      l.employees?.last_name?.toLowerCase().includes(searchLower)
    return matchesCategory && matchesSearch
  })

  const getBalance = (leaveTypeId: string) =>
    balances?.find(b => b.leave_type_id === leaveTypeId)

  const handleAction = async (id: string, status: string) => {
    setConfirmAction({ id, status })
    setRejectReason('')
  }

  const executeAction = async () => {
    if (!confirmAction) return
    try {
      await updateStatus({ id: confirmAction.id, status: confirmAction.status, review_notes: confirmAction.status === 'rejected' ? rejectReason : undefined })
      toast.success(`Leave request ${confirmAction.status}`)
      setConfirmAction(null)
    } catch {
      toast.error('Failed to update leave request')
    }
  }

  const pendingCount = filteredLeaves?.filter(l => l.status === 'pending').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee leave requests and track balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-4" />
            Export
          </Button>
          <RequestLeaveDialog />
        </div>
      </div>

      {/* Requests */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              Pending
              {pendingCount > 0 && (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-[200px] pl-9"
              />
            </div>
            {can.manageLeaves() && (
              <Select value={selectedCategory || 'all'} onValueChange={v => setSelectedCategory(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {leaveTypes?.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {['all', 'pending', 'approved', 'rejected'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : !filteredLeaves?.length ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
                <Calendar className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm font-medium">No leave requests</p>
                <p className="text-xs text-muted-foreground">No {tab !== 'all' ? tab : ''} leave requests found</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLeaves.map(lr => (
                  <motion.div key={lr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <LeaveCard leave={lr} onAction={handleAction} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.status === 'approved' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to {confirmAction?.status === 'approved' ? 'approve' : 'reject'} this request?
            </p>
            {confirmAction?.status === 'rejected' && (
              <div className="space-y-1.5">
                <Label>Reason for rejection *</Label>
                <Textarea 
                  value={rejectReason} 
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this request is rejected..."
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button 
                variant={confirmAction?.status === 'rejected' ? 'destructive' : 'default'}
                onClick={executeAction}
                disabled={confirmAction?.status === 'rejected' && !rejectReason.trim()}
              >
                Confirm {confirmAction?.status === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
