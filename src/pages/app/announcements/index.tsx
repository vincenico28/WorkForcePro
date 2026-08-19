import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone, Pin, AlertTriangle, Calendar, Info, FileText, Plus, Loader2,
  Pencil, Trash2, Sparkles, Printer, Search, Building2, Gift, CloudRain,
  ShieldCheck, CheckCircle2, Users, Download, ArrowRight, BookOpen, Clock, FileSpreadsheet
} from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, useDepartments } from '@/hooks/use-misc'
import { useEmployees } from '@/hooks/use-employees'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { Announcement } from '@/types'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; badgeBg: string }> = {
  general: { label: 'General', icon: Info, className: 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' },
  urgent: { label: 'Urgent Alert', icon: AlertTriangle, className: 'bg-red-500/10 text-red-600 dark:bg-red-950/50 dark:text-red-400', badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300' },
  policy: { label: 'DOLE & Company Policy', icon: FileText, className: 'bg-amber-500/10 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' },
  holiday: { label: 'Holiday & Pay Rules', icon: Calendar, className: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' },
  benefits: { label: 'Compensation & Benefits', icon: Gift, className: 'bg-purple-500/10 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400', badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' },
  event: { label: 'Event', icon: Calendar, className: 'bg-sky-500/10 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400', badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300' },
}

// ================= HR MEMO TEMPLATES =================
const HR_MEMO_TEMPLATES = [
  {
    name: 'Typhoon / Weather Advisory (PAGASA)',
    type: 'urgent',
    title: 'URGENT: Severe Weather Protocol & Remote Clock-In Advisory',
    content: `MEMORANDUM: ADVERSE WEATHER & LOGISTICS SAFETY PROTOCOL

In light of the inclement weather conditions and PAGASA advisory, the Management issues the following safety guidelines for all logistics, warehousing, and administrative personnel:

1. SAFETY FIRST: Personnel in affected areas with flooded roadways are advised to prioritize their safety and coordinate with their direct supervisor.
2. FIELD OPERATIONS: Dispatch routes in flooded zones are suspended until local authorities clear safe passage.
3. ATTENDANCE & REMOTE CLOCK-IN: Geofence restrictions are temporarily bypassed for affected personnel. Remote clock-in is authorized.
4. COMMUNICATIONS: Keep active communication channels open with your department supervisor.

Issued by: Office of the HR Director & Operations Safety Committee`,
  },
  {
    name: 'DOLE Regular / Special Holiday Pay Rules',
    type: 'holiday',
    title: 'NOTICE: Upcoming Holiday Schedule & Statutory DOLE Pay Compliance',
    content: `MEMORANDUM: UPCOMING REGULAR / SPECIAL NON-WORKING HOLIDAY

Please be informed of the official operating schedule and statutory wage rules compliant with Department of Labor and Employment (DOLE) regulations:

1. OPERATIONAL SCHEDULE:
   - Administrative and Corporate Offices: CLOSED
   - 24/7 Logistics Hubs, Dispatch, & Sorting Facilities: SKELETAL ON-DUTY ROSTER

2. STATUTORY DOLE PAY COMPUTATION:
   - Regular Holiday: Unworked employees receive 100% daily rate. Employees on duty receive 200% for the first 8 hours + 30% for overtime.
   - Special Non-Working Day: "No work, no pay" principle applies unless company practice dictates otherwise. On-duty employees receive 130% daily rate.

Please refer to the published schedule for your designated shift assignment.`,
  },
  {
    name: '13th Month Pay & Year-End Merit Bonus',
    type: 'benefits',
    title: 'NOTICE: Release Schedule for 13th Month Pay & Annual Bonus Ledger',
    content: `MEMORANDUM: DISBURSEMENT OF 13TH MONTH PAY & MERIT INCENTIVES

The Management is pleased to announce the disbursement timeline for statutory 13th-month pay and merit bonus allocations:

1. STATUTORY ELIGIBILITY (Presidential Decree No. 851): All regular and probationary employees who have rendered at least one (1) month of service within the calendar year.
2. RELEASE DATE: Direct deposit to enrolled payroll accounts on or before the upcoming payroll cutoff.
3. BREAKDOWN: Full breakdown of basic pay computations, tax exemptions (up to PHP 90,000 threshold), and performance bonuses will be reflected on your digital payslip.

Thank you for your dedicated service to Priority Handling Logistics, Inc.`,
  },
  {
    name: 'Biometric Face ID & Attendance Compliance',
    type: 'policy',
    title: 'POLICY UPDATE: Mandatory Facial Biometrics & Geofence Verification',
    content: `MEMORANDUM: WORKFORCE BIOMETRIC ATTENDANCE ENFORCEMENT

To ensure precise DOLE timecard recording and prevent buddy punching, all employees are reminded of the company timekeeping policy:

1. BIOMETRIC ENROLLMENT: All active personnel must complete desk-side facial recognition enrollment with HR.
2. GEOFENCE COMPLIANCE: Clock-ins must be executed within the 100-meter designated hub perimeter.
3. ANOMALIES: Unverified clock-ins or missing timestamps must be justified with an Official Business (OB) slip submitted to HR within 48 hours.

Strict adherence is appreciated.`,
  },
]

// ================= CREATE ANNOUNCEMENT MODAL =================
function CreateAnnouncementDialog({ departments }: { departments?: any[] }) {
  const { employee } = useAuthStore()
  const { mutateAsync, isPending } = useCreateAnnouncement()
  const [open, setOpen] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'general' as string,
    is_pinned: false,
    department_id: 'all',
  })

  const applyTemplate = (template: typeof HR_MEMO_TEMPLATES[0]) => {
    setForm(prev => ({
      ...prev,
      title: template.title,
      content: template.content,
      type: template.type,
      is_pinned: template.type === 'urgent',
    }))
    toast.success(`Loaded template: "${template.name}"`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) {
      toast.error('Title and content are required')
      return
    }
    try {
      await mutateAsync({
        title: form.title,
        content: form.content,
        type: form.type as any,
        is_pinned: form.is_pinned,
        department_id: form.department_id === 'all' ? undefined : form.department_id,
        author_id: employee?.id,
      })
      toast.success('Announcement memorandum published successfully')
      setOpen(false)
      setForm({ title: '', content: '', type: 'general', is_pinned: false, department_id: 'all' })
    } catch (err: any) {
      toast.error('Failed to publish announcement', { description: err.message })
    }
  }

  const handleEnhance = async () => {
    if (!form.content.trim()) {
      toast.error('Please write a draft first')
      return
    }
    
    setIsEnhancing(true)
    const t = toast.loading('Polishing memorandum with AI...')
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not defined')
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
      
      const prompt = `You are an Executive HR Director at Priority Handling Logistics, Inc. Rewrite the following draft into a polished, formal, and authoritative company memorandum. 
Use clear structure, professional Philippine business english, bullet points for key directives, and an official tone. Do not wrap in markdown quotes.

Draft: "${form.content}"`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      
      setForm(prev => ({ ...prev, content: text }))
      toast.success('Memorandum enhanced!')
    } catch (error: any) {
      toast.error('AI Enhancement Failed', { description: error.message })
    } finally {
      toast.dismiss(t)
      setIsEnhancing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish HR Memorandum & Announcement</DialogTitle>
          <DialogDescription>
            Broadcast official company news, DOLE labor policies, holiday wage rules, or urgent weather advisories.
          </DialogDescription>
        </DialogHeader>

        {/* Quick 1-Click Templates */}
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs text-muted-foreground font-semibold uppercase">1-Click HR Memo Templates</Label>
          <div className="flex flex-wrap gap-2">
            {HR_MEMO_TEMPLATES.map((tmpl) => (
              <Button
                key={tmpl.name}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 hover:border-primary"
                onClick={() => applyTemplate(tmpl)}
              >
                <BookOpen className="size-3" />
                {tmpl.name}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Memorandum Title *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. NOTICE: Official Holiday Schedule & DOLE Wage Guidelines"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Announcement Category</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className="size-3.5" />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Target Audience / Department</Label>
              <Select value={form.department_id} onValueChange={v => setForm(p => ({ ...p, department_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees (Company-Wide)</SelectItem>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Memorandum Body *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1 bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300"
                onClick={handleEnhance}
                disabled={isEnhancing || !form.content}
              >
                {isEnhancing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                Polish with AI
              </Button>
            </div>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Write official memorandum details..."
              rows={8}
              required
              className="font-sans text-xs sm:text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Pin Announcement to Top</p>
              <p className="text-[11px] text-muted-foreground">Keep prominently displayed on the employee portal</p>
            </div>
            <Switch
              checked={form.is_pinned}
              onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Publishing...</> : 'Publish Memorandum'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ================= EDIT ANNOUNCEMENT MODAL =================
function EditAnnouncementDialog({ ann, onClose, departments }: { ann: any; onClose: () => void; departments?: any[] }) {
  const { mutateAsync, isPending } = useUpdateAnnouncement()
  const [form, setForm] = useState({
    title: ann.title ?? '',
    content: ann.content ?? '',
    type: ann.type ?? 'general',
    is_pinned: ann.is_pinned ?? false,
    department_id: ann.department_id ?? 'all',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) { toast.error('Title and content are required'); return }
    try {
      await mutateAsync({
        id: ann.id,
        title: form.title,
        content: form.content,
        type: form.type,
        is_pinned: form.is_pinned,
        department_id: form.department_id === 'all' ? null : form.department_id,
      })
      toast.success('Announcement updated')
      onClose()
    } catch (err: any) {
      toast.error('Failed to update announcement', { description: err.message })
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Edit Announcement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2"><cfg.icon className="size-3.5" />{cfg.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department Scope</Label>
              <Select value={form.department_id} onValueChange={v => setForm(p => ({ ...p, department_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Content *</Label>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6} required />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-xs font-semibold">Pin announcement</p>
              <p className="text-[11px] text-muted-foreground">Keep at top of list</p>
            </div>
            <Switch checked={form.is_pinned} onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ================= PRINTABLE OFFICIAL MEMO MODAL =================
function OfficialMemoViewerDialog({ ann, onClose }: { ann: any; onClose: () => void }) {
  if (!ann) return null

  const handlePrint = () => {
    window.print()
  }

  const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.general

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <div className="flex items-center gap-2 mb-1">
            {ann.is_pinned && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Pin className="size-2.5" /> Pinned Memo
              </Badge>
            )}
            <Badge className={`text-xs ${cfg.badgeBg}`}>
              {cfg.label}
            </Badge>
          </div>
          <DialogTitle className="text-lg">{ann.title}</DialogTitle>
        </DialogHeader>

        {/* Official Printable Company Memo Layout */}
        <div className="p-6 bg-white text-black font-sans rounded-xl border print:border-none print:p-0">
          <div className="text-center space-y-1 pb-4 border-b-2 border-black">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-700">Internal Corporate Communications</h2>
            <h1 className="text-2xl font-black uppercase tracking-wider">PRIORITY HANDLING LOGISTICS, INC.</h1>
            <p className="text-xs text-gray-600">Air, Sea & Ground Freight Solutions • DOLE Registered</p>
            <div className="pt-2">
              <span className="inline-block border-2 border-black px-4 py-0.5 font-black text-sm uppercase tracking-widest">
                OFFICIAL MEMORANDUM
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-black">
            <div className="space-y-1.5">
              <p><span className="font-bold">FOR / TO:</span> All Personnel & Logistics Operations</p>
              <p><span className="font-bold">FROM:</span> Human Resources & Operations Management</p>
              <p><span className="font-bold">ISSUED BY:</span> {ann.employees ? `${ann.employees.first_name} ${ann.employees.last_name}` : 'HR Management'}</p>
            </div>
            <div className="space-y-1.5 text-right">
              <p><span className="font-bold">REF NO:</span> MEMO-{ann.id.split('-')[0].toUpperCase()}</p>
              <p><span className="font-bold">DATE:</span> {ann.published_at ? format(new Date(ann.published_at), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy')}</p>
              <p><span className="font-bold">CLASSIFICATION:</span> {cfg.label.toUpperCase()}</p>
            </div>
          </div>

          <div className="py-3 border-b border-black">
            <p className="text-sm font-black uppercase">SUBJECT: {ann.title}</p>
          </div>

          <div className="py-6 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed font-sans text-gray-900 min-h-[220px]">
            {ann.content}
          </div>

          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center border-t border-black">
            <div>
              <p className="font-bold uppercase">Human Resources Department</p>
              <p className="text-[10px] text-gray-600">Priority Handling Logistics, Inc.</p>
            </div>
            <div>
              <p className="font-bold uppercase">Office of the Executive Managing Director</p>
              <p className="text-[10px] text-gray-600">Approved & Enforced</p>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4" /> Print Official Memo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ================= MAIN ANNOUNCEMENTS PAGE =================
export default function AnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  const { data: departments } = useDepartments()
  const { can } = usePermissions()
  const { employee } = useAuthStore()
  const { mutateAsync: deleteAnn } = useDeleteAnnouncement()
  
  const [editingAnn, setEditingAnn] = useState<any | null>(null)
  const [viewingAnn, setViewingAnn] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const handleDelete = async (id: string) => {
    try {
      await deleteAnn(id)
      toast.success('Announcement deleted')
    } catch (err: any) {
      toast.error('Failed to delete announcement', { description: err.message })
    }
  }

  const canManage = (ann: any) =>
    can.isHR() || ann.author_id === employee?.id

  // Filtered announcements
  const filtered = useMemo(() => {
    if (!announcements) return []
    return announcements.filter(a => {
      const matchSearch = !search || 
        a.title.toLowerCase().includes(search.toLowerCase()) || 
        a.content.toLowerCase().includes(search.toLowerCase()) ||
        `${a.employees?.first_name || ''} ${a.employees?.last_name || ''}`.toLowerCase().includes(search.toLowerCase())
      
      const matchType = selectedType === 'all' || a.type === selectedType

      return matchSearch && matchType
    })
  }, [announcements, search, selectedType])

  const pinned = filtered.filter(a => a.is_pinned)
  const regular = filtered.filter(a => !a.is_pinned)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Internal Communications & Policy Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Publish official company memorandums, DOLE labor policies, PAGASA weather advisories, and compensation notices
          </p>
        </div>
        {can.createAnnouncements() && <CreateAnnouncementDialog departments={departments} />}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{announcements?.length || 0}</p>
              <p className="text-xs text-muted-foreground font-medium">Published Memos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{announcements?.filter(a => a.type === 'urgent').length || 0}</p>
              <p className="text-xs text-muted-foreground font-medium">Urgent Advisories</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{announcements?.filter(a => a.type === 'policy').length || 0}</p>
              <p className="text-xs text-muted-foreground font-medium">DOLE Policies</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Pin className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{announcements?.filter(a => a.is_pinned).length || 0}</p>
              <p className="text-xs text-muted-foreground font-medium">Pinned Directives</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3.5 border-border/70 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search memo title, keywords, or author..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedType('all')}
            >
              All Types
            </Button>
            {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
              <Button
                key={k}
                variant={selectedType === k ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setSelectedType(k)}
              >
                <cfg.icon className="size-3" />
                {cfg.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Pin className="size-3.5" />
                Pinned Company Directives
              </div>
              <div className="grid gap-3">
                {pinned.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    ann={ann}
                    canManage={canManage(ann)}
                    onEdit={() => setEditingAnn(ann)}
                    onDelete={() => handleDelete(ann.id)}
                    onView={() => setViewingAnn(ann)}
                  />
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Announcements
                </div>
              )}
              <div className="grid gap-3">
                {regular.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    ann={ann}
                    canManage={canManage(ann)}
                    onEdit={() => setEditingAnn(ann)}
                    onDelete={() => handleDelete(ann.id)}
                    onView={() => setViewingAnn(ann)}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Megaphone className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold">No announcements found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search criteria or publish a new memorandum.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingAnn && (
        <EditAnnouncementDialog
          ann={editingAnn}
          onClose={() => setEditingAnn(null)}
          departments={departments}
        />
      )}

      {/* Printable Official Memo Dialog */}
      {viewingAnn && (
        <OfficialMemoViewerDialog
          ann={viewingAnn}
          onClose={() => setViewingAnn(null)}
        />
      )}
    </div>
  )
}

// ================= ANNOUNCEMENT CARD =================
function AnnouncementCard({
  ann,
  canManage,
  onEdit,
  onDelete,
  onView,
}: {
  ann: any
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}) {
  const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.general
  const Icon = cfg.icon

  return (
    <Card 
      className={`transition-all hover:shadow-md cursor-pointer border-border/70 ${ann.is_pinned ? 'border-primary/40 bg-primary/[0.01]' : ''}`}
      onClick={onView}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${cfg.className}`}>
            <Icon className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {ann.is_pinned && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0.5 bg-primary/10 text-primary">
                  <Pin className="size-2.5" />
                  Pinned
                </Badge>
              )}
              <Badge className={`text-[10px] px-2 py-0.5 ${cfg.badgeBg}`}>{cfg.label}</Badge>
            </div>

            <h3 className="font-bold text-sm sm:text-base text-foreground mb-1 line-clamp-1">{ann.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{ann.content}</p>

            <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Avatar className="size-5 ring-1 ring-border">
                  {ann.employees?.avatar_url && <AvatarImage src={ann.employees.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-[9px] text-primary font-bold">
                    {`${ann.employees?.first_name?.[0] ?? ''}${ann.employees?.last_name?.[0] ?? ''}`}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {ann.employees?.first_name} {ann.employees?.last_name}
                </span>
                <span>•</span>
                <span>
                  {ann.published_at ? format(new Date(ann.published_at), 'MMM d, yyyy h:mm a') : format(new Date(ann.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={onView}>
                  <Printer className="size-3" /> Memo View
                </Button>
                {canManage && (
                  <>
                    <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{ann.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
