import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, addDays } from 'date-fns'
import {
  Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Plus, Filter, Download,
  ChevronRight, Loader2, Search, Sparkles, FileImage, AlertCircle, FileUp
} from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useLeaveRequests, useLeaveTypes, useLeaveBalances, useCreateLeaveRequest, useUpdateLeaveStatus, useRequestCompliance, useUploadComplianceDocument } from '@/hooks/use-leaves'
import { useEmployees } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/utils/export'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
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
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
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
    
    if (isSickLeave && !file) {
      toast.error('Medical Certificate is required for Sick Leave')
      return
    }

    let attachment_url = undefined
    if (file) {
      setUploading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('leave_attachments')
          .upload(`public/${fileName}`, file)
        
        if (uploadErr) throw uploadErr

        const { data: publicUrlData } = supabase.storage
          .from('leave_attachments')
          .getPublicUrl(`public/${fileName}`)
          
        attachment_url = publicUrlData.publicUrl
      } catch (err: any) {
        toast.error('Failed to upload medical certificate', { description: err.message })
        setUploading(false)
        return
      }
      setUploading(false)
    }

    try {
      await mutateAsync({ ...form, total_days: days, status: 'pending', attachment_url })
      toast.success('Leave request submitted!', { description: 'Your request is pending approval.' })
      setOpen(false)
      setFile(null)
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.start_date ? format(new Date(form.start_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.start_date ? new Date(form.start_date) : undefined}
                    onSelect={(d) => d && update('start_date', format(d, 'yyyy-MM-dd'))}
                    disabled={(date) => date < addDays(new Date(), 6)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.end_date ? format(new Date(form.end_date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.end_date ? new Date(form.end_date) : undefined}
                    onSelect={(d) => d && update('end_date', format(d, 'yyyy-MM-dd'))}
                    disabled={(date) => date < (form.start_date ? new Date(form.start_date) : addDays(new Date(), 6))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
          <div className="space-y-1.5">
            <Label>Compliance Document {isSickLeave ? '*' : '(Optional)'}</Label>
            <input
              type="file"
              required={isSickLeave}
              accept="image/*,.pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium file:mr-4 file:px-3 file:py-1 file:rounded-md shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground">Required for Sick Leave. Optional for others (PDF, JPG, PNG)</p>
          </div>
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
            <Button type="submit" disabled={isPending || uploading || !form.leave_type_id || !form.start_date || !form.end_date}>
              {(isPending || uploading) ? <><Loader2 className="mr-2 size-4 animate-spin" />Submitting...</> : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LeaveCard({ 
  leave, 
  onAction,
  onRequestCompliance,
  onUploadCompliance 
}: { 
  leave: LeaveRequest; 
  onAction?: (id: string, status: string) => void;
  onRequestCompliance?: (id: string) => void;
  onUploadCompliance?: (id: string, file: File) => Promise<void>;
}) {
  const { can } = usePermissions()
  const cfg = STATUS_CONFIG[leave.status]
  const Icon = cfg?.icon ?? Clock

  const [certOpen, setCertOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [evalOpen, setEvalOpen] = useState(false)
  const [evalResult, setEvalResult] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)

  const handleEvaluate = async () => {
    setEvalOpen(true)
    if (evalResult) return // Already evaluated

    setIsEvaluating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not defined')
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })
      
      const prompt = `You are a professional HR Leave Policy Evaluator. 
Analyze the following leave request:
- Employee: ${leave.employees?.first_name} ${leave.employees?.last_name} (${leave.employees?.position})
- Leave Type: ${leave.leave_types?.name}
- Duration: ${leave.total_days} days
- Reason: ${leave.reason || 'None provided'}
- Medical Certificate Attached: ${leave.attachment_url ? 'Yes' : 'No'}

Please provide a short summary of the request, note any policy flags (like missing medical certificates for sick leave), and give a final recommendation (Approve/Reject). Format nicely in Markdown.`

      const result = await model.generateContent(prompt)
      setEvalResult(result.response.text())
    } catch (err: any) {
      setEvalResult('Failed to evaluate: ' + err.message)
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 shrink-0">
              {leave.employees?.avatar_url && <AvatarImage src={leave.employees.avatar_url} className="object-cover" />}
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

        {leave.status === 'rejected' && leave.review_notes && (
          <div className="mt-3 rounded-md bg-red-50 p-2.5 dark:bg-red-950/50">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">Rejection Reason</p>
            <p className="mt-1 text-xs text-red-600/90 dark:text-red-400/90">"{leave.review_notes}"</p>
          </div>
        )}

        {leave.attachment_url && (
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => setCertOpen(true)}>
              <FileImage className="size-3" />
              View Attached Document
            </Button>
            <Dialog open={certOpen} onOpenChange={setCertOpen}>
              <DialogContent className="max-w-2xl bg-transparent border-none shadow-none text-white sm:rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="w-full bg-background rounded-xl shadow-2xl overflow-hidden p-2">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <h3 className="text-sm font-semibold text-foreground">Attached Document</h3>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={leave.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground">
                          Open Original <ChevronRight className="size-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                    {leave.attachment_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={leave.attachment_url} className="w-full h-[60vh] rounded-lg border" />
                    ) : (
                      <img src={leave.attachment_url} alt="Attached Document" className="w-full max-h-[80vh] object-contain rounded-lg" />
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {leave.compliance_document_url && (
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900 dark:text-emerald-400 dark:bg-emerald-950/30" onClick={() => setFollowUpOpen(true)}>
              <FileImage className="size-3" />
              View Follow-Up Document
            </Button>
            <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
              <DialogContent className="max-w-2xl bg-transparent border-none shadow-none text-white sm:rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="w-full bg-background rounded-xl shadow-2xl overflow-hidden p-2">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <h3 className="text-sm font-semibold text-foreground">Follow-Up Document</h3>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={leave.compliance_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground">
                          Open Original <ChevronRight className="size-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                    {leave.compliance_document_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={leave.compliance_document_url} className="w-full h-[60vh] rounded-lg border" />
                    ) : (
                      <img src={leave.compliance_document_url} alt="Follow-Up Document" className="w-full max-h-[80vh] object-contain rounded-lg" />
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {leave.compliance_requested && !leave.compliance_document_url && leave.status === 'pending' && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            <div className="flex items-start gap-2 text-amber-800 dark:text-amber-400">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Action Required</p>
                <p className="text-xs mt-1">Please provide a follow-up document by {leave.compliance_due_date ? format(new Date(leave.compliance_due_date), 'MMM d, yyyy') : 'the due date'}.</p>
                {leave.review_notes && <p className="text-xs italic mt-1 bg-amber-100/50 p-1.5 rounded text-amber-900 dark:text-amber-300">"{leave.review_notes}"</p>}
              </div>
            </div>
            {!can.approveLeaves() && onUploadCompliance && (
              <div className="mt-3 flex items-center gap-2">
                <Input type="file" id={`upload-${leave.id}`} className="text-xs h-8" onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onUploadCompliance(leave.id, e.target.files[0])
                  }
                }} />
              </div>
            )}
          </div>
        )}

        {leave.status === 'pending' && can.approveLeaves() && (
          <div className="mt-3">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:text-violet-700" onClick={handleEvaluate}>
              <Sparkles className="size-3" /> AI Policy Evaluator
            </Button>
            <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-violet-600">
                    <Sparkles className="size-4" /> AI Policy Recommendation
                  </DialogTitle>
                </DialogHeader>
                <div className="min-h-[150px] max-h-[60vh] overflow-y-auto pr-2 flex flex-col pt-4">
                  {isEvaluating ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="size-6 animate-spin text-violet-500" />
                      <p className="text-sm text-muted-foreground animate-pulse">Analyzing company policies...</p>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground space-y-2 leading-relaxed whitespace-pre-wrap">
                      {evalResult}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {leave.status === 'pending' && onAction && can.approveLeaves() && (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              {onRequestCompliance && !leave.compliance_requested && (
                <Button size="sm" variant="outline" className="flex-1 border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950" onClick={() => onRequestCompliance(leave.id)}>
                  <FileUp className="mr-1.5 size-3.5" />
                  Request Doc
                </Button>
              )}
            </div>
            <div className="flex gap-2 w-full">
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
  const [complianceAction, setComplianceAction] = useState<string | null>(null)
  const [complianceDate, setComplianceDate] = useState<Date | undefined>(undefined)
  const [complianceNotes, setComplianceNotes] = useState('')
  const { employee } = useAuthStore()
  const { data: leaves, isLoading } = useLeaveRequests(activeTab)
  const { mutateAsync: updateStatus } = useUpdateLeaveStatus()
  const { mutateAsync: requestCompliance } = useRequestCompliance()
  const { mutateAsync: uploadCompliance } = useUploadComplianceDocument()
  const { data: leaveTypes } = useLeaveTypes()

  const handleUploadCompliance = async (id: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `compliance_${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error: uploadErr } = await supabase.storage.from('leave_attachments').upload(`public/${fileName}`, file)
      if (uploadErr) throw uploadErr
      const { data: publicUrlData } = supabase.storage.from('leave_attachments').getPublicUrl(`public/${fileName}`)
      await uploadCompliance({ id, compliance_document_url: publicUrlData.publicUrl })
      toast.success('Document uploaded successfully')
    } catch (err: any) {
      toast.error('Failed to upload document', { description: err.message })
    }
  }

  const executeComplianceRequest = async () => {
    if (!complianceAction || !complianceDate) return
    try {
      await requestCompliance({ id: complianceAction, dueDate: complianceDate.toISOString(), notes: complianceNotes })
      toast.success('Compliance request sent')
      setComplianceAction(null)
      setComplianceDate(undefined)
      setComplianceNotes('')
    } catch {
      toast.error('Failed to send compliance request')
    }
  }

  const handleExport = () => {
    if (!leaves?.length) {
      toast.error('No leave data to export')
      return
    }
    const exportData = leaves.map(l => ({
      ID: l.id,
      Employee: l.employees ? `${l.employees.first_name} ${l.employees.last_name}` : 'Unknown',
      'Leave Type': l.leave_types?.name || 'Unknown',
      'Start Date': l.start_date,
      'End Date': l.end_date,
      'Total Days': l.total_days,
      Reason: l.reason || '',
      Status: l.status
    }))
    downloadCSV(exportData, `leave_requests_export_${format(new Date(), 'yyyy-MM-dd')}`)
    toast.success('Leave requests exported successfully')
  }

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
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
          <RequestLeaveDialog />
        </div>
      </div>

      {/* Balances Overview */}
      {balances && balances.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {balances.map(b => {
            const remaining = Math.max(0, (b.allocated_days || 0) - (b.used_days || 0))
            const percent = ((b.used_days || 0) / (b.allocated_days || 1)) * 100
            return (
              <Card key={b.id} className="relative overflow-hidden border-border/50 bg-background/50 backdrop-blur">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <div className="size-16 rounded-full" style={{ background: b.leave_types?.color || '#ccc' }} />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className="size-2.5 rounded-full" style={{ background: b.leave_types?.color || '#ccc' }} />
                    {b.leave_types?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{remaining} <span className="text-sm font-normal text-muted-foreground">days left</span></div>
                  <Progress value={percent} className="h-1.5 mt-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {b.used_days} used out of {b.allocated_days}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                    <LeaveCard 
                      leave={lr} 
                      onAction={handleAction} 
                      onRequestCompliance={setComplianceAction}
                      onUploadCompliance={handleUploadCompliance}
                    />
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

      {/* Compliance Request Dialog */}
      <Dialog open={!!complianceAction} onOpenChange={() => { setComplianceAction(null); setComplianceDate(undefined); setComplianceNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Compliance Document</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !complianceDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {complianceDate ? format(complianceDate, 'PPP') : <span>Pick a due date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={complianceDate} onSelect={setComplianceDate} disabled={(date) => date < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Instructions / Notes</Label>
              <Textarea 
                value={complianceNotes} 
                onChange={e => setComplianceNotes(e.target.value)}
                placeholder="E.g. Please provide a valid medical certificate by this date..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setComplianceAction(null); setComplianceDate(undefined); setComplianceNotes(''); }}>Cancel</Button>
              <Button onClick={executeComplianceRequest} disabled={!complianceDate}>Send Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
