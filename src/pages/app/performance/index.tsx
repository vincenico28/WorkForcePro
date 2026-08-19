import { useState, useMemo, useRef } from 'react'
import {
  Star, TrendingUp, Target, Award, Plus, ChevronRight,
  Users, CheckCircle, Clock, BarChart3, Loader2, Brain, Sparkles, Search,
  Printer, ShieldCheck, FileCheck2, AlertCircle, HelpCircle, ArrowUpRight,
  Calendar, Check, ChevronsUpDown, Download, Lock
} from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  usePerformanceReviews,
  useCreatePerformanceReview,
  useAcknowledgePerformanceReview
} from '@/hooks/use-performance'
import { useEmployees } from '@/hooks/use-employees'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import type { PerformanceReview } from '@/types'
import { GoogleGenerativeAI } from '@google/generative-ai'

const chartConfig = {
  avg: { label: 'Avg Rating', color: 'var(--chart-1)' },
  value: { label: 'Score', color: 'var(--chart-2)' },
}

export function getPerformanceTier(score: number): {
  tier: string
  label: string
  color: string
  badgeClass: string
  description: string
  bonusEligible: boolean
  bonusRate: string
} {
  if (score >= 4.5) {
    return {
      tier: 'exceeds',
      label: 'Exceeds Expectations',
      color: '#10b981',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
      description: 'Outstanding performance across all core competencies. Recommended for Merit Bonus & Fast-track Promotion.',
      bonusEligible: true,
      bonusRate: '₱3,000.00 (Tier 1)',
    }
  }
  if (score >= 4.0) {
    return {
      tier: 'high_meets',
      label: 'Above Standard / High Meets',
      color: '#8b5cf6',
      badgeClass: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300',
      description: 'Consistently surpasses target operational deliverables and exhibits proactive teamwork.',
      bonusEligible: true,
      bonusRate: '₱1,500.00 (Tier 2)',
    }
  }
  if (score >= 3.0) {
    return {
      tier: 'meets',
      label: 'Meets Expectations',
      color: '#3b82f6',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
      description: 'Satisfactorily satisfies standard KPIs, quality benchmarks, and company guidelines.',
      bonusEligible: false,
      bonusRate: 'Standard Base',
    }
  }
  if (score >= 2.0) {
    return {
      tier: 'needs_improvement',
      label: 'Needs Improvement',
      color: '#f59e0b',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
      description: 'Inconsistent performance in key areas. Recommended for 30-Day Coaching & Action Plan.',
      bonusEligible: false,
      bonusRate: 'Not Eligible',
    }
  }
  return {
    tier: 'critical',
    label: 'Critical / Unsatisfactory',
    color: '#ef4444',
    badgeClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300',
    description: 'Fails to meet minimum productivity and attendance standards. Subject to HR PIP escalation.',
    bonusEligible: false,
    bonusRate: 'Not Eligible',
  }
}

const REVIEW_CYCLE_LABELS: Record<string, string> = {
  quarterly: 'Quarterly Review',
  semi_annual: 'Mid-Year Review',
  annual: 'Annual Appraisal',
  probationary: 'Probationary / 90-Day',
  project: 'Project-Based Evaluation',
}

const REVIEW_STATUS: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted (Pending Ack)', className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300', icon: Clock },
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400', icon: Clock },
  acknowledged: { label: 'Acknowledged & Certified', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300', icon: CheckCircle },
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.floor(rating) 
              ? 'fill-amber-400 text-amber-400' 
              : star <= rating 
                ? 'fill-amber-200 text-amber-400' 
                : 'text-muted-foreground/30 fill-none'
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs font-bold text-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <span className="text-xs font-bold text-primary">{value.toFixed(1)} / 5.0</span>
      </div>
      <input
        type="range" min={1} max={5} step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
    </div>
  )
}

/**
 * Official DOLE / HR Compliant Performance Appraisal Sheet Dialog
 */
function AppraisalDetailDialog({
  review,
  onClose,
  currentUserId,
  isEmployeeView,
}: {
  review: PerformanceReview
  onClose: () => void
  currentUserId?: string
  isEmployeeView?: boolean
}) {
  const [comments, setComments] = useState(review.employee_comments || '')
  const { mutateAsync: acknowledgeReview, isPending } = useAcknowledgePerformanceReview()
  const printableRef = useRef<HTMLDivElement>(null)

  const { can } = usePermissions()
  const { employee } = useAuthStore()
  const isHigherUp = can.managePerformance() || can.isHR() || employee?.role === 'admin' || employee?.role === 'super_admin' || employee?.role === 'hr_manager' || employee?.role === 'team_supervisor'

  const overall = review.overall_rating || 3.5
  const tier = getPerformanceTier(overall)

  const isEmpOwnReview = currentUserId === review.employee_id
  const canAcknowledge = isEmpOwnReview && review.status === 'submitted'

  const handleSignAcknowledgement = async () => {
    try {
      await acknowledgeReview({
        id: review.id,
        employeeComments: comments,
      })
      toast.success('Performance review acknowledged successfully!')
      onClose()
    } catch (err: any) {
      toast.error('Failed to acknowledge review', { description: err.message })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const competencies = [
    { name: 'Job Knowledge & Technical Competence', rating: review.job_knowledge_rating || 0 },
    { name: 'Work Quality & Output Accuracy', rating: review.work_quality_rating || 0 },
    { name: 'Attendance, Punctuality & Reliability', rating: review.attendance_rating || 0 },
    { name: 'Communication & Teamwork Collaboration', rating: review.teamwork_rating || 0 },
    { name: 'Initiative, Problem Solving & Proactivity', rating: review.initiative_rating || 0 },
  ]

  const radarData = competencies.map(c => ({
    subject: c.name.split('&')[0].trim(),
    score: c.rating * 20,
    fullMark: 100,
  }))

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-border">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-primary/95 to-slate-900 text-white p-6 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <FileCheck2 className="size-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">PRIORITY HANDLING LOGISTICS, INC.</h2>
                <p className="text-xs text-white/80">Employee Performance Appraisal & Development Sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`px-2.5 py-1 text-xs font-semibold ${tier.badgeClass}`}>
                {tier.label}
              </Badge>
              <Button size="sm" variant="secondary" onClick={handlePrint} className="gap-1.5 bg-white/20 text-white hover:bg-white/30 border-white/30">
                <Printer className="size-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        <div ref={printableRef} className="p-6 space-y-6 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-xl border border-border/60">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Employee Name</span>
              <p className="font-semibold text-foreground mt-0.5">
                {review.employees ? `${review.employees.first_name} ${review.employees.last_name}` : 'Unknown'}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-medium">Department / Role</span>
              <p className="font-semibold text-foreground mt-0.5">
                {review.employees?.departments?.name || 'Logistics'} &bull; {review.employees?.position || 'Staff'}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-medium">Review Period</span>
              <p className="font-semibold text-foreground mt-0.5">
                {review.review_period_start ? format(new Date(review.review_period_start), 'MMM d, yyyy') : '—'} – {review.review_period_end ? format(new Date(review.review_period_end), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-medium">Evaluator</span>
              <p className="font-semibold text-foreground mt-0.5">
                {isHigherUp ? (
                  review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : 'HR / Supervisor'
                ) : (
                  <span className="text-muted-foreground italic flex items-center gap-1">
                    <Lock className="size-3 text-muted-foreground/70" /> Confidential Evaluator
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Overall Rating & Performance Tier Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex flex-col items-center justify-center font-bold shadow-md">
                <span className="text-2xl leading-none">{overall.toFixed(1)}</span>
                <span className="text-[10px] opacity-80 mt-0.5">/ 5.0</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">{tier.label}</span>
                  <StarRating rating={overall} />
                </div>
                <p className="text-xs text-muted-foreground max-w-md">{tier.description}</p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-border/60 sm:pl-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Payroll Merit Status</span>
              <p className={`text-sm font-bold mt-0.5 ${tier.bonusEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {tier.bonusEligible ? `Eligible (${tier.bonusRate})` : 'Standard Performance'}
              </p>
            </div>
          </div>

          {/* Competency Ratings Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Competency Evaluation Matrix (Weight 20% each)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {competencies.map(c => (
                <div key={c.name} className="p-3 rounded-lg border border-border/80 bg-card space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="font-bold text-primary">{c.rating.toFixed(1)} / 5.0</span>
                  </div>
                  <Progress value={(c.rating / 5) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Growth Areas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50 space-y-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Key Strengths</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {review.strengths || 'Demonstrates strong consistency and reliable work ethics in regular assigned functions.'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-1">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Areas for Growth</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {review.improvements || 'Focus on cross-functional logistics synchronization and proactive issue reporting.'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/50 space-y-1">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-400">Next Quarter Objectives</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {review.goals || 'Attain zero delivery delay benchmarks and complete scheduled logistics safety workshops.'}
              </p>
            </div>
          </div>

          {/* Employee Acknowledgement & Response Section */}
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Employee Sign-off & Acknowledgement
              </h3>
              <Badge className={review.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}>
                {review.status === 'acknowledged' ? 'Acknowledged & Certified' : 'Pending Employee Signature'}
              </Badge>
            </div>

            {review.status === 'acknowledged' ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <span>Digitally Signed by Employee</span>
                  <span>{review.acknowledged_at ? format(new Date(review.acknowledged_at), 'MMM d, yyyy h:mm a') : 'Acknowledged'}</span>
                </div>
                {review.employee_comments && (
                  <p className="text-xs text-muted-foreground italic bg-background/80 p-3 rounded border border-border">
                    "{review.employee_comments}"
                  </p>
                )}
              </div>
            ) : canAcknowledge ? (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/[0.03] space-y-3">
                <p className="text-xs text-muted-foreground">
                  Please review the evaluation above. You may provide your feedback, self-reflection, or comments below prior to acknowledging:
                </p>
                <Textarea
                  placeholder="Optional: Write your self-reflection, feedback, or development comments here..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
                <Button 
                  onClick={handleSignAcknowledgement} 
                  disabled={isPending}
                  className="w-full sm:w-auto gap-1.5"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                  Sign & Acknowledge Appraisal
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground italic flex items-center gap-2">
                <Clock className="size-4 text-amber-500 shrink-0" />
                This review is awaiting the employee's formal digital acknowledgement and sign-off.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AIPerformanceInsights({ reviews }: { reviews: PerformanceReview[] | undefined }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState('')
  const [error, setError] = useState('')

  const generateInsights = async () => {
    if (!reviews || reviews.length === 0) {
      toast.error('Not enough data to generate insights')
      return
    }
    
    setLoading(true)
    setError('')
    setInsights('')
    
    const data = reviews.map(r => ({
      overall: r.overall_rating,
      knowledge: r.job_knowledge_rating,
      quality: r.work_quality_rating,
      attendance: r.attendance_rating,
      teamwork: r.teamwork_rating,
      initiative: r.initiative_rating,
      status: r.status,
    })).filter(r => r.overall !== undefined)

    const prompt = `You are the Lead HR Performance Director for "Priority Handling Logistics, Inc." Based on the following performance review scores for our workforce, provide an executive summary:
    1. Overall Workforce Competency Health & Strengths
    2. Operational Bottlenecks (Attendance, Quality, Knowledge gaps)
    3. Recommendations for Logistics Training Programs & Merit Bonus Allocations.
    Data: ${JSON.stringify(data)}
    Format your response in clean Markdown with bullet points.`

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
      
      const result = await model.generateContentStream(prompt)

      for await (const chunk of result.stream) {
        setInsights(prev => prev + chunk.text())
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Gemini. Please check your API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant="outline" 
        className="gap-1.5 shrink-0 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" 
        onClick={() => { setOpen(true); if (!insights && !loading) generateInsights(); }}
      >
        <Sparkles className="size-4" /> AI HR Insights
      </Button>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Brain className="size-4 text-white" />
            </div>
            AI Performance & Workforce Insights
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-1 mt-4">
          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-sm">
              <p className="font-semibold mb-1">Connection Error</p>
              <p>{error}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={generateInsights}>Retry</Button>
              </div>
            </div>
          ) : insights ? (
            <div className="space-y-2 text-sm bg-muted/30 p-4 rounded-lg border border-border/50 whitespace-pre-wrap">
              {insights}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="size-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Running HR Executive Analysis...</p>
            </div>
          ) : null}
        </div>
        
        <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
          <span>Powered by Gemini Flash</span>
          <Button variant="ghost" size="sm" onClick={generateInsights} disabled={loading}>
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [newReviewOpen, setNewReviewOpen] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null)
  
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const { data: reviews, isLoading } = usePerformanceReviews()
  const { data: employees } = useEmployees()
  const createReview = useCreatePerformanceReview()

  const [form, setForm] = useState({
    employee_id: '',
    review_type: 'quarterly' as PerformanceReview['review_type'],
    review_period_start: format(new Date(), 'yyyy-MM-01'),
    review_period_end: format(new Date(), 'yyyy-MM-dd'),
    overall_rating: 4.0,
    job_knowledge_rating: 4.0,
    work_quality_rating: 4.0,
    attendance_rating: 4.0,
    teamwork_rating: 4.0,
    initiative_rating: 4.0,
    strengths: '',
    improvements: '',
    goals: '',
    status: 'submitted' as PerformanceReview['status'],
  })

  // Summary statistics
  const stats = useMemo(() => {
    if (!reviews?.length) return { avgRating: 0, acknowledged: 0, total: 0, bonusEligibleCount: 0 }
    const rated = reviews.filter(r => r.overall_rating)
    const avgRating = rated.length ? rated.reduce((a, r) => a + (r.overall_rating ?? 0), 0) / rated.length : 0
    const acknowledged = reviews.filter(r => r.status === 'acknowledged').length
    const bonusEligibleCount = reviews.filter(r => (r.overall_rating ?? 0) >= 4.0).length
    return { avgRating, acknowledged, total: reviews.length, bonusEligibleCount }
  }, [reviews])

  const topPerformer = useMemo(() => {
    const rated = reviews?.filter(r => r.overall_rating && r.employees)
    if (!rated?.length) return null
    return rated.reduce((a, b) => (a.overall_rating ?? 0) > (b.overall_rating ?? 0) ? a : b)
  }, [reviews])

  const myReviews = useMemo(() => {
    if (!reviews || !employee?.id) return []
    return reviews.filter(r => r.employee_id === employee.id)
  }, [reviews, employee?.id])

  const radarData = useMemo(() => {
    if (!reviews?.length) return []
    const fields = [
      { skill: 'Knowledge', key: 'job_knowledge_rating' as const },
      { skill: 'Quality', key: 'work_quality_rating' as const },
      { skill: 'Attendance', key: 'attendance_rating' as const },
      { skill: 'Teamwork', key: 'teamwork_rating' as const },
      { skill: 'Initiative', key: 'initiative_rating' as const },
    ]
    return fields.map(f => {
      const vals = reviews.filter(r => r[f.key]).map(r => (r[f.key] as number) * 20)
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { skill: f.skill, value: Math.round(avg) }
    })
  }, [reviews])

  const trendData = useMemo(() => {
    if (!reviews?.length) return []
    const byPeriod: Record<string, number[]> = {}
    reviews.forEach(r => {
      if (!r.overall_rating) return
      const key = r.review_period_start ? format(new Date(r.review_period_start), 'MMM yyyy') : 'Unknown'
      if (!byPeriod[key]) byPeriod[key] = []
      byPeriod[key].push(r.overall_rating)
    })
    return Object.entries(byPeriod).map(([period, vals]) => ({
      quarter: period,
      avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
    }))
  }, [reviews])

  const filteredReviews = useMemo(() => {
    if (!reviews) return []
    if (!searchQuery) return reviews
    const q = searchQuery.toLowerCase()
    return reviews.filter(r => {
      const name = `${r.employees?.first_name} ${r.employees?.last_name}`.toLowerCase()
      const dept = r.employees?.departments?.name?.toLowerCase() ?? ''
      const pos = r.employees?.position?.toLowerCase() ?? ''
      return name.includes(q) || dept.includes(q) || pos.includes(q)
    })
  }, [reviews, searchQuery])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    try {
      const calculatedOverall = (
        form.job_knowledge_rating + 
        form.work_quality_rating + 
        form.attendance_rating + 
        form.teamwork_rating + 
        form.initiative_rating
      ) / 5;

      await createReview.mutateAsync({
        ...form,
        reviewer_id: employee.id,
        overall_rating: calculatedOverall,
        submitted_at: form.status === 'submitted' ? new Date().toISOString() : undefined,
      })
      toast.success('Performance appraisal submitted for employee acknowledgement')
      setNewReviewOpen(false)
      setForm(f => ({ ...f, employee_id: '', strengths: '', improvements: '', goals: '' }))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Performance Management</h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              HR DOLE Standard
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Appraisal cycles, competency matrices, employee acknowledgements & merit bonuses</p>
        </div>
        <div className="flex items-center gap-2">
          <AIPerformanceInsights reviews={reviews} />
          {can.managePerformance() && (
            <Button className="gap-1.5 shrink-0" onClick={() => setNewReviewOpen(true)}>
              <Plus className="size-4" /> New Appraisal
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: 'Company Avg Rating', icon: Star, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/50',
            value: stats.avgRating ? `${stats.avgRating.toFixed(2)}/5.0` : '—',
            change: reviews?.length ? `${reviews.length} appraisals conducted` : 'No data',
          },
          {
            label: 'Certified & Signed', icon: FileCheck2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50',
            value: `${stats.acknowledged}/${stats.total}`,
            change: stats.total ? `${Math.round(stats.acknowledged / stats.total * 100)}% signed off` : '0%',
          },
          {
            label: 'Merit Bonus Eligible', icon: Award, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-950/50',
            value: String(stats.bonusEligibleCount),
            change: 'Rated ≥ 4.0 High Performance',
          },
          {
            label: 'Top Performer', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/50',
            value: topPerformer?.employees?.first_name ? `${topPerformer.employees.first_name} ${topPerformer.employees.last_name || ''}` : '—',
            change: topPerformer?.overall_rating ? `${topPerformer.overall_rating.toFixed(1)} rating (${getPerformanceTier(topPerformer.overall_rating).label})` : 'No data',
          },
        ].map(s => (
          <Card key={s.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-xl font-bold truncate">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.change}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`size-4 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Executive Overview</TabsTrigger>
          <TabsTrigger value="employees">All Appraisals ({reviews?.length || 0})</TabsTrigger>
          <TabsTrigger value="my_reviews">
            My Appraisals ({myReviews.length})
            {myReviews.some(r => r.status === 'submitted') && (
              <Badge className="ml-1.5 bg-amber-500 text-white size-2 p-0 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="bonuses">Merit Bonus Ledger ({stats.bonusEligibleCount})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="lg:col-span-2 h-64" />
              <div className="space-y-3">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            </div>
          ) : reviews?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Star className="size-7 text-primary" />
                </div>
                <h3 className="font-semibold">No performance appraisals yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Conduct the first HR performance appraisal cycle to track workforce competencies</p>
                {can.managePerformance() && (
                  <Button className="mt-4 gap-1.5" onClick={() => setNewReviewOpen(true)}>
                    <Plus className="size-4" /> New Appraisal
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quarterly Performance Trend</CardTitle>
                  <CardDescription>Average employee appraisal ratings across cycles</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
                    <BarChart data={trendData} margin={{ left: -20 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="quarter" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="avg" fill="var(--color-avg)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">HR Appraisal Sign-off Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {(['draft', 'submitted', 'acknowledged'] as const).map(s => {
                      const count = reviews?.filter(r => r.status === s).length ?? 0
                      const pct = stats.total ? (count / stats.total) * 100 : 0
                      const st = REVIEW_STATUS[s]
                      return (
                        <div key={s} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{st.label}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {radarData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Workforce Competency Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="min-h-[160px] w-full">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                          <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} />
                        </RadarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* All Appraisals Masterlist */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search employee, position, or department..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? 'No appraisal records match your search' : 'No appraisals recorded'}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map(review => {
                const st = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.draft
                const Icon = st.icon
                const emp = review.employees
                const overall = review.overall_rating || 3.5
                const tier = getPerformanceTier(overall)

                return (
                  <Card 
                    key={review.id} 
                    onClick={() => setSelectedReview(review)}
                    className="group transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-border hover:border-primary/40 flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-9 rounded-xl">
                            {emp?.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                            <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold text-primary">
                              {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">
                              {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{emp?.position ?? emp?.departments?.name}</p>
                          </div>
                        </div>
                        <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 gap-1 ${st.className}`}>
                          <Icon className="size-2.5" />
                          {review.status === 'acknowledged' ? 'Certified' : 'Pending Ack'}
                        </Badge>
                      </div>

                      {/* Performance Tier & Score */}
                      <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/50">
                        <Badge variant="outline" className={`text-[10px] ${tier.badgeClass}`}>
                          {tier.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-foreground">{overall.toFixed(1)} / 5.0</span>
                        </div>
                      </div>

                      {/* Competencies Mini Matrix */}
                      <div className="grid grid-cols-5 gap-1 text-center">
                        <div className="rounded bg-muted/40 p-1">
                          <p className="text-[10px] font-bold">{review.job_knowledge_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[8px] text-muted-foreground truncate">Know</p>
                        </div>
                        <div className="rounded bg-muted/40 p-1">
                          <p className="text-[10px] font-bold">{review.work_quality_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[8px] text-muted-foreground truncate">Qual</p>
                        </div>
                        <div className="rounded bg-muted/40 p-1">
                          <p className="text-[10px] font-bold">{review.attendance_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[8px] text-muted-foreground truncate">Att</p>
                        </div>
                        <div className="rounded bg-muted/40 p-1">
                          <p className="text-[10px] font-bold">{review.teamwork_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[8px] text-muted-foreground truncate">Team</p>
                        </div>
                        <div className="rounded bg-muted/40 p-1">
                          <p className="text-[10px] font-bold">{review.initiative_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[8px] text-muted-foreground truncate">Init</p>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{review.review_period_start ? format(new Date(review.review_period_start), 'MMM yyyy') : 'General'}</span>
                        <div className="flex items-center gap-0.5 text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                          <span>View Sheet</span>
                          <ChevronRight className="size-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* My Appraisals Tab */}
        <TabsContent value="my_reviews" className="mt-4 space-y-4">
          {myReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileCheck2 className="size-8 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-foreground">No appraisals on file</p>
                <p className="text-xs mt-1">Your manager has not published a performance review for your account yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myReviews.map(review => {
                const overall = review.overall_rating || 3.5
                const tier = getPerformanceTier(overall)
                const isPendingAck = review.status === 'submitted'

                return (
                  <Card 
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`cursor-pointer transition-all hover:shadow-md border ${
                      isPendingAck ? 'border-amber-400 bg-amber-50/10' : 'border-border'
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={isPendingAck ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}>
                          {isPendingAck ? 'Action Required: Sign Acknowledgement' : 'Certified & Signed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {review.review_period_start ? format(new Date(review.review_period_start), 'MMM d, yyyy') : 'Appraisal'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-bold text-foreground">{tier.label}</p>
                          <p className="text-xs text-muted-foreground">Overall Rating: {overall.toFixed(1)} / 5.0</p>
                        </div>
                        <StarRating rating={overall} />
                      </div>

                      {review.strengths && (
                        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded">
                          <strong>Supervisor Strengths Note:</strong> {review.strengths}
                        </p>
                      )}

                      <Button size="sm" className="w-full gap-1.5" variant={isPendingAck ? 'default' : 'outline'}>
                        {isPendingAck ? <ShieldCheck className="size-4" /> : <FileCheck2 className="size-4" />}
                        {isPendingAck ? 'Review & Sign Acknowledgement' : 'View Official Appraisal Sheet'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Merit & Bonus Eligibility Tab */}
        <TabsContent value="bonuses" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payroll Performance Incentive Ledger</CardTitle>
              <CardDescription>
                Employees meeting the DOLE & Company standard (Score ≥ 4.0) eligible for automatic disbursement in Philippine Payroll
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Appraisal Score</TableHead>
                    <TableHead>Performance Tier</TableHead>
                    <TableHead className="text-right">Merit Incentive</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews?.filter(r => (r.overall_rating ?? 0) >= 4.0).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">
                        No employees currently qualifying for Performance Merit Bonuses.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviews?.filter(r => (r.overall_rating ?? 0) >= 4.0).map(review => {
                      const emp = review.employees
                      const score = review.overall_rating || 0
                      const tier = getPerformanceTier(score)

                      return (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7">
                                {emp?.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                  {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : 'E'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{emp?.departments?.name || 'Logistics'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-sm">{score.toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${tier.badgeClass}`}>
                              {tier.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {tier.bonusRate}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px]">
                              Payroll Connected
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Official Appraisal Sheet Modal */}
      {selectedReview && (
        <AppraisalDetailDialog
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          currentUserId={employee?.id}
        />
      )}

      {/* New Appraisal Dialog */}
      <Dialog open={newReviewOpen} onOpenChange={setNewReviewOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conduct Performance Appraisal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between font-normal"
                  >
                    {form.employee_id
                      ? (() => {
                          const emp = employees?.find((e) => e.id === form.employee_id)
                          return emp ? `${emp.first_name} ${emp.last_name}` : 'Select employee'
                        })()
                      : 'Select employee to evaluate...'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee by name..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees?.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.first_name} ${emp.last_name}`}
                            onSelect={() => {
                              setForm(f => ({ ...f, employee_id: emp.id }))
                              setComboboxOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 size-4',
                                form.employee_id === emp.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {emp.first_name} {emp.last_name} &bull; {emp.position || 'Staff'}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Appraisal Cycle *</Label>
                <Select 
                  value={form.review_type} 
                  onValueChange={v => setForm(f => ({ ...f, review_type: v as PerformanceReview['review_type'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly Review</SelectItem>
                    <SelectItem value="semi_annual">Mid-Year Review</SelectItem>
                    <SelectItem value="annual">Annual Appraisal</SelectItem>
                    <SelectItem value="probationary">Probationary (90-Day)</SelectItem>
                    <SelectItem value="project">Project Evaluation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period Start *</Label>
                <Input
                  type="date"
                  value={form.review_period_start}
                  onChange={e => setForm(f => ({ ...f, review_period_start: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period End *</Label>
                <Input
                  type="date"
                  value={form.review_period_end}
                  onChange={e => setForm(f => ({ ...f, review_period_end: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Competency Range Sliders */}
            <div className="space-y-3 rounded-lg border border-border p-3.5 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Competency Evaluation (5.0 Scale)</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Overall:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                    <Star className="mr-1 size-3 fill-primary text-primary" />
                    {((form.job_knowledge_rating + form.work_quality_rating + form.attendance_rating + form.teamwork_rating + form.initiative_rating) / 5).toFixed(1)} / 5.0
                  </Badge>
                </div>
              </div>
              <RatingInput label="Job Knowledge & Technical Competence" value={form.job_knowledge_rating} onChange={v => setForm(f => ({ ...f, job_knowledge_rating: v }))} />
              <RatingInput label="Work Quality & Accuracy" value={form.work_quality_rating} onChange={v => setForm(f => ({ ...f, work_quality_rating: v }))} />
              <RatingInput label="Attendance, Punctuality & Reliability" value={form.attendance_rating} onChange={v => setForm(f => ({ ...f, attendance_rating: v }))} />
              <RatingInput label="Communication & Teamwork" value={form.teamwork_rating} onChange={v => setForm(f => ({ ...f, teamwork_rating: v }))} />
              <RatingInput label="Initiative & Proactivity" value={form.initiative_rating} onChange={v => setForm(f => ({ ...f, initiative_rating: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Key Strengths</Label>
              <Textarea
                value={form.strengths}
                onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
                placeholder="Highlight notable achievements and competencies..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Areas for Improvement & Development</Label>
              <Textarea
                value={form.improvements}
                onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
                placeholder="Specific improvement recommendations..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next Period SMART Goals</Label>
              <Textarea
                value={form.goals}
                onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
                placeholder="Key goals and milestones for the upcoming quarter..."
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setNewReviewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createReview.isPending || !form.employee_id}>
                {createReview.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit for Employee Sign-off
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
