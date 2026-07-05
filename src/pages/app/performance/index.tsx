import { useState, useMemo } from 'react'
import {
  Star, TrendingUp, Target, Award, Plus, ChevronRight,
  Users, CheckCircle, Clock, BarChart3, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { usePerformanceReviews, useCreatePerformanceReview } from '@/hooks/use-performance'
import { useEmployees } from '@/hooks/use-employees'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { PerformanceReview } from '@/types'

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

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [newReviewOpen, setNewReviewOpen] = useState(false)
  const { employee } = useAuthStore()
  const { data: reviews, isLoading } = usePerformanceReviews()
  const { data: employees } = useEmployees()
  const createReview = useCreatePerformanceReview()

  const [form, setForm] = useState({
    employee_id: '',
    review_period_start: '',
    review_period_end: '',
    overall_rating: 3.5,
    goals_met: 3.5,
    communication_rating: 3.5,
    teamwork_rating: 3.5,
    technical_rating: 3.5,
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
      { skill: 'Communication', key: 'communication_rating' as const },
      { skill: 'Teamwork', key: 'teamwork_rating' as const },
      { skill: 'Technical', key: 'technical_rating' as const },
      { skill: 'Goals', key: 'goals_met' as const },
      { skill: 'Overall', key: 'overall_rating' as const },
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    try {
      await createReview.mutateAsync({ ...form, reviewer_id: employee.id })
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
        <Button className="gap-1.5 shrink-0" onClick={() => setNewReviewOpen(true)}>
          <Plus className="size-4" />New Review
        </Button>
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
                <Button className="mt-4 gap-1.5" onClick={() => setNewReviewOpen(true)}>
                  <Plus className="size-4" />New Review
                </Button>
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
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : reviews?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No reviews yet</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reviews?.map(review => {
                const st = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.draft
                const Icon = st.icon
                const emp = review.employees
                return (
                  <Card key={review.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 rounded-xl">
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

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold">{review.goals_met?.toFixed(1) ?? '—'}</p>
                          <p className="text-[10px] text-muted-foreground">Goals met</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-bold">{review.technical_rating?.toFixed(1) ?? '—'}</p>
                          <p className="text-[10px] text-muted-foreground">Technical</p>
                        </div>
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
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">RATINGS</p>
              <RatingInput label="Overall Rating" value={form.overall_rating} onChange={v => setForm(f => ({ ...f, overall_rating: v }))} />
              <RatingInput label="Goals Met" value={form.goals_met} onChange={v => setForm(f => ({ ...f, goals_met: v }))} />
              <RatingInput label="Communication" value={form.communication_rating} onChange={v => setForm(f => ({ ...f, communication_rating: v }))} />
              <RatingInput label="Teamwork" value={form.teamwork_rating} onChange={v => setForm(f => ({ ...f, teamwork_rating: v }))} />
              <RatingInput label="Technical" value={form.technical_rating} onChange={v => setForm(f => ({ ...f, technical_rating: v }))} />
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
