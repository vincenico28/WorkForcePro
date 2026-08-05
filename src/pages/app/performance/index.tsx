import { useState, useMemo } from 'react'
import {
  Star, TrendingUp, Target, Award, Plus, ChevronRight,
  Users, CheckCircle, Clock, BarChart3, Loader2, Brain, Sparkles, Search
} from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { usePerformanceReviews, useCreatePerformanceReview } from '@/hooks/use-performance'
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

const REVIEW_STATUS: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  submitted: { label: 'Submitted', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  draft: { label: 'Draft', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', icon: Clock },
  acknowledged: { label: 'Acknowledged', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400', icon: CheckCircle },
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`size-3 ${star <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : star <= rating ? 'fill-amber-200 text-amber-400' : 'text-border fill-none'}`}
        />
      ))}
      <span className="ml-1 text-xs font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

function RatingInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-medium text-muted-foreground">{value.toFixed(1)}/5.0</span>
      </div>
      <input
        type="range" min={1} max={5} step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

function formatMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.startsWith('**')) {
      return <p key={i} className="text-sm">{line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</p>
    }
    if (line.startsWith('#')) {
      return <p key={i} className="font-bold text-lg mt-2 mb-1">{line.replace(/#/g, '')}</p>
    }
    if (line.startsWith('* ')) {
      return <li key={i} className="text-sm ml-4 list-disc">{line.substring(2)}</li>
    }
    if (line === '') return <div key={i} className="h-1" />
    return <p key={i} className="text-sm leading-relaxed">{line}</p>
  })
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
    
    // Anonymize and bundle data
    const data = reviews.map(r => ({
      overall: r.overall_rating,
      knowledge: r.job_knowledge_rating,
      quality: r.work_quality_rating,
      attendance: r.attendance_rating,
      teamwork: r.teamwork_rating,
      initiative: r.initiative_rating,
      status: r.status
    })).filter(r => r.overall !== undefined)

    const prompt = `You are an expert HR Analyst. Based on the following anonymous performance review scores for our workforce, provide a brief executive summary. Highlight the key strengths, weaknesses, and recommend specific training programs.
    Data: ${JSON.stringify(data)}
    Format your response in Markdown using bullet points and short paragraphs.`

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
        <Sparkles className="size-4" /> AI Insights
      </Button>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Brain className="size-4 text-white" />
            </div>
            AI Performance Insights
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-1 mt-4">
          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-sm">
              <p className="font-semibold mb-1">Connection Error</p>
              <p>{error}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={generateInsights}>Retry Connection</Button>
              </div>
            </div>
          ) : insights ? (
            <div className="space-y-1 text-sm bg-muted/30 p-4 rounded-lg border border-border/50">
              {formatMessage(insights)}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="size-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Running Gemini AI Analysis...</p>
            </div>
          ) : null}
        </div>
        
        <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
          <span>Powered by Ollama</span>
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
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const { data: reviews, isLoading } = usePerformanceReviews()
  const { data: employees } = useEmployees()
  const createReview = useCreatePerformanceReview()

  const [form, setForm] = useState({
    employee_id: '',
    review_period_start: '',
    review_period_end: '',
    overall_rating: 3.5,
    job_knowledge_rating: 3.5,
    work_quality_rating: 3.5,
    attendance_rating: 3.5,
    teamwork_rating: 3.5,
    initiative_rating: 3.5,
    strengths: '',
    improvements: '',
    goals: '',
    status: 'draft' as PerformanceReview['status'],
  })

  const stats = useMemo(() => {
    if (!reviews?.length) return { avgRating: 0, submitted: 0, total: 0 }
    const rated = reviews.filter(r => r.overall_rating)
    const avgRating = rated.length ? rated.reduce((a, r) => a + (r.overall_rating ?? 0), 0) / rated.length : 0
    const submitted = reviews.filter(r => r.status === 'submitted' || r.status === 'acknowledged').length
    return { avgRating, submitted, total: reviews.length }
  }, [reviews])

  const topPerformer = useMemo(() => {
    const rated = reviews?.filter(r => r.overall_rating && r.employees)
    if (!rated?.length) return null
    return rated.reduce((a, b) => (a.overall_rating ?? 0) > (b.overall_rating ?? 0) ? a : b)
  }, [reviews])

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
      const calculatedOverall = (form.job_knowledge_rating + form.work_quality_rating + form.attendance_rating + form.teamwork_rating + form.initiative_rating) / 5;
      await createReview.mutateAsync({ ...form, reviewer_id: employee.id, overall_rating: calculatedOverall })
      toast.success('Review created')
      setNewReviewOpen(false)
      setForm(f => ({ ...f, employee_id: '', strengths: '', improvements: '', goals: '' }))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="text-sm text-muted-foreground">Track employee performance, goals, and reviews</p>
        </div>
        {can.managePerformance() && (
          <div className="flex items-center gap-2">
            <AIPerformanceInsights reviews={reviews} />
            <Button className="gap-1.5 shrink-0" onClick={() => setNewReviewOpen(true)}>
              <Plus className="size-4" />New Review
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: 'Avg Rating', icon: Star, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/50',
            value: stats.avgRating ? `${stats.avgRating.toFixed(1)}/5.0` : '—',
            change: reviews?.length ? `${reviews.length} reviews` : 'No reviews yet',
          },
          {
            label: 'Reviews Done', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50',
            value: `${stats.submitted}/${stats.total}`,
            change: stats.total ? `${Math.round(stats.submitted / stats.total * 100)}% complete` : 'No reviews',
          },
          {
            label: 'Total Reviews', icon: Target, color: 'text-primary', bg: 'bg-primary/10',
            value: String(stats.total),
            change: reviews?.filter(r => r.status === 'draft').length + ' drafts',
          },
          {
            label: 'Top Performer', icon: Award, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-950/50',
            value: topPerformer?.employees?.first_name ?? '—',
            change: topPerformer?.overall_rating ? `${topPerformer.overall_rating.toFixed(1)} rating` : 'No data',
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Reviews</TabsTrigger>
        </TabsList>

        {/* Overview */}
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
                <h3 className="font-semibold">No reviews yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Create the first performance review to get started</p>
                {can.managePerformance() && (
                  <Button className="mt-4 gap-1.5" onClick={() => setNewReviewOpen(true)}>
                    <Plus className="size-4" />New Review
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Performance Trend</CardTitle>
                  <CardDescription>Average rating by review period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
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
                    <CardTitle className="text-sm">Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {(['draft', 'submitted', 'acknowledged'] as const).map(s => {
                      const count = reviews?.filter(r => r.status === s).length ?? 0
                      const pct = stats.total ? (count / stats.total) * 100 : 0
                      const st = REVIEW_STATUS[s]
                      return (
                        <div key={s} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{st.label}</span>
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
                      <CardTitle className="text-sm">Skills Radar</CardTitle>
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

        {/* Reviews Tab */}
        <TabsContent value="employees" className="mt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, role, or department..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? 'No reviews match your search' : 'No reviews yet'}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReviews.map(review => {
                const st = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.draft
                const Icon = st.icon
                const emp = review.employees
                return (
                  <Card key={review.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 rounded-xl">
                            {emp?.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-sm font-semibold text-primary">
                              {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{emp?.position ?? emp?.departments?.name}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs shrink-0 gap-1 ${st.className}`}>
                          <Icon className="size-2.5" />
                          {st.label}
                        </Badge>
                      </div>

                      {review.overall_rating && (
                        <div className="mt-4">
                          <StarRating rating={review.overall_rating} />
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <div className="flex-1 min-w-[30%] rounded-lg bg-muted/50 p-1.5 text-center">
                          <p className="text-xs font-bold">{review.job_knowledge_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight">Knowledge</p>
                        </div>
                        <div className="flex-1 min-w-[30%] rounded-lg bg-muted/50 p-1.5 text-center">
                          <p className="text-xs font-bold">{review.work_quality_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight">Quality</p>
                        </div>
                        <div className="flex-1 min-w-[30%] rounded-lg bg-muted/50 p-1.5 text-center">
                          <p className="text-xs font-bold">{review.attendance_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight">Attendance</p>
                        </div>
                        <div className="flex-1 min-w-[30%] rounded-lg bg-muted/50 p-1.5 text-center">
                          <p className="text-xs font-bold">{review.teamwork_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight">Teamwork</p>
                        </div>
                        <div className="flex-1 min-w-[30%] rounded-lg bg-muted/50 p-1.5 text-center">
                          <p className="text-xs font-bold">{review.initiative_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[9px] text-muted-foreground leading-tight">Initiative</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {review.strengths && (
                          <div>
                            <p className="text-xs font-semibold text-primary">Strengths</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {review.strengths}
                            </p>
                          </div>
                        )}
                        {review.improvements && (
                          <div>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Areas for Improvement</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {review.improvements}
                            </p>
                          </div>
                        )}
                        {review.goals && (
                          <div>
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Goals</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {review.goals}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {review.review_period_start
                            ? format(new Date(review.review_period_start), 'MMM yyyy')
                            : 'No period'}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Review Dialog */}
      <Dialog open={newReviewOpen} onOpenChange={setNewReviewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Performance Review</DialogTitle>
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
                      : 'Select employee...'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[460px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
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
                            {emp.first_name} {emp.last_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">SPECIFIC RATINGS</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Auto-Calculated Overall:</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Star className="mr-1 size-3 fill-primary text-primary" />
                    {((form.job_knowledge_rating + form.work_quality_rating + form.attendance_rating + form.teamwork_rating + form.initiative_rating) / 5).toFixed(1)}
                  </Badge>
                </div>
              </div>
              <RatingInput label="Job Knowledge" value={form.job_knowledge_rating} onChange={v => setForm(f => ({ ...f, job_knowledge_rating: v }))} />
              <RatingInput label="Work Quality" value={form.work_quality_rating} onChange={v => setForm(f => ({ ...f, work_quality_rating: v }))} />
              <RatingInput label="Attendance & Punctuality" value={form.attendance_rating} onChange={v => setForm(f => ({ ...f, attendance_rating: v }))} />
              <RatingInput label="Communication & Teamwork" value={form.teamwork_rating} onChange={v => setForm(f => ({ ...f, teamwork_rating: v }))} />
              <RatingInput label="Initiative & Proactivity" value={form.initiative_rating} onChange={v => setForm(f => ({ ...f, initiative_rating: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Strengths</Label>
              <Textarea
                value={form.strengths}
                onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
                placeholder="Key strengths..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Areas for Improvement</Label>
              <Textarea
                value={form.improvements}
                onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
                placeholder="Areas to develop..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Goals</Label>
              <Textarea
                value={form.goals}
                onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
                placeholder="Next period goals..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PerformanceReview['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewReviewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createReview.isPending || !form.employee_id}>
                {createReview.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
