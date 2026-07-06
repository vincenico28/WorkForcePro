import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Clock, Calendar, BarChart3, Shield, Zap, Globe, Award,
  ChevronRight, Check, Star, ArrowRight, Building2, TrendingUp,
  Menu, X, Brain, Bell, FileText, Layers
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '@/components/mode-toggle'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

const STATS = [
  { value: '50K+', label: 'Employees Managed' },
  { value: '1,200+', label: 'Companies Trust Us' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9/5', label: 'Customer Rating' },
]

const FEATURES = [
  {
    icon: Clock,
    title: 'Time & Attendance',
    desc: 'Real-time clock in/out with GPS verification, biometric ready, QR attendance, and automatic overtime detection.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Calendar,
    title: 'Shift & Scheduling',
    desc: 'Drag-and-drop scheduler with conflict detection, recurring shifts, rotation management, and swap approvals.',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
  },
  {
    icon: Users,
    title: 'Leave Management',
    desc: 'Configurable leave types, accrual policies, multi-level approval workflows, and real-time balance tracking.',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    icon: BarChart3,
    title: 'Workforce Analytics',
    desc: 'Predictive analytics, absenteeism forecasting, productivity heatmaps, and executive-ready reports.',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
  },
  {
    icon: Brain,
    title: 'AI Assistant',
    desc: 'Natural language HR queries, intelligent scheduling recommendations, burnout detection, and smart insights.',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'SOC 2 compliant, RBAC, 2FA, audit logs, data encryption at rest and in transit, SSO ready.',
    color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Real-time alerts across email, SMS, push, Slack, and Teams. Configurable notification rules.',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40',
  },
  {
    icon: FileText,
    title: 'Document Management',
    desc: 'Centralized document storage, e-signature ready, automated HR document workflows and templates.',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40',
  },
  {
    icon: Layers,
    title: 'Payroll Integration',
    desc: 'Seamless sync with major payroll providers. Automated timesheet exports, tax calculations, and compliance.',
    color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40',
  },
]

const TESTIMONIALS = [
  {
    name: 'Rachel Kim',
    title: 'VP People Operations, Lightwave Inc.',
    avatar: 'RK',
    rating: 5,
    text: 'WorkForce Pro transformed how we manage our 800+ distributed team. The AI scheduling alone saved us 15 hours per week in manual coordination.',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    name: 'James Okonkwo',
    title: 'CHRO, Meridian Financial',
    avatar: 'JO',
    rating: 5,
    text: "The analytics dashboard gives our leadership team real-time visibility we never had before. It's like having a workforce intelligence team on demand.",
    color: 'from-emerald-500 to-teal-600',
  },
  {
    name: 'Sofia Reyes',
    title: 'HR Director, Pacific Retail Group',
    avatar: 'SR',
    rating: 5,
    text: 'Implementation took less than a week and our teams adopted it immediately. The mobile attendance feature with GPS is a game-changer for our retail locations.',
    color: 'from-rose-500 to-pink-600',
  },
]

const FAQS = [
  {
    q: 'How long does implementation take?',
    a: 'Most customers are fully operational within 5–7 business days. Our onboarding team handles data migration, configuration, and employee training. Enterprise implementations with custom integrations typically take 2–4 weeks.',
  },
  {
    q: 'Can I migrate data from my existing system?',
    a: 'Yes. We support data import from all major HRIS platforms including Workday, SAP SuccessFactors, BambooHR, ADP, and Excel. Our migration team manages the process end-to-end.',
  },
  {
    q: 'Is there a mobile app available?',
    a: 'Yes. Native iOS and Android apps support all core features including biometric clock-in, GPS attendance, leave requests, schedule viewing, and push notifications.',
  },
  {
    q: 'How does the AI assistant work?',
    a: 'The AI is trained on your workforce data and HR policies. It answers natural language queries, generates reports, predicts attendance patterns, and surfaces proactive insights about your workforce.',
  },
  {
    q: 'What security certifications does WorkForce Pro hold?',
    a: 'We are SOC 2 Type II certified, GDPR compliant, and ISO 27001 certified. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We support SSO/SAML 2.0 for Enterprise plans.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes, we offer a 14-day free trial on all plans with no credit card required. You get full access to all features, sample data, and a dedicated onboarding session.',
  },
]

const COMPANIES = ['Acme Corp', 'Helios Tech', 'Meridian', 'Lightwave', 'Pacific Group', 'Nexus AI', 'Stratos', 'CoreVault']

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden">
              <img src="/hr-manager.png" alt="Logo" className="size-full object-cover" />
            </div>
            <span className="text-lg font-semibold tracking-tight">WorkForce<span className="text-primary">Pro</span></span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link to="/login" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:block">
              Sign In
            </Link>
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} className="text-sm font-medium" onClick={() => setMobileOpen(false)}>
                  {l.label}
                </a>
              ))}
              <Separator />
              <Link to="/login" className="text-sm font-medium">Sign In</Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 size-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-0 top-1/4 size-[400px] rounded-full bg-violet-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="size-3.5" />
            AI-Powered Enterprise HR Platform
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" custom={1} variants={fadeUp}
            className="text-5xl font-extrabold tracking-tight text-balance md:text-7xl"
          >
            Workforce Management
            <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-400 bg-clip-text text-transparent">
              Reimagined for Scale
            </span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" custom={2} variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            Unify attendance, scheduling, leave management, payroll, and HR analytics in one intelligent platform. Trusted by 1,200+ companies managing over 50,000 employees worldwide.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" custom={3} variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link to="/login">
              <Button size="lg" className="gap-2 px-8 text-base">
                Sign In
                <ChevronRight className="size-4" />
              </Button>
            </Link>
          </motion.div>

          {/* HERO DASHBOARD MOCKUP */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className="mt-16 overflow-hidden rounded-2xl border border-border shadow-2xl shadow-primary/10"
          >
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="size-3 rounded-full bg-destructive/60" />
              <div className="size-3 rounded-full bg-warning/60" />
              <div className="size-3 rounded-full bg-success/60" />
              <div className="ml-4 flex-1 rounded-md bg-background/60 px-3 py-1 text-left text-xs text-muted-foreground">
                app.workforcepro.com/dashboard
              </div>
            </div>
            <div className="bg-muted/20 p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Total Employees', value: '284', change: '+12', icon: Users, color: 'bg-primary/10 text-primary' },
                  { label: 'Present Today', value: '247', change: '87%', icon: Check, color: 'bg-emerald-500/10 text-emerald-600' },
                  { label: 'On Leave', value: '23', change: '8%', icon: Calendar, color: 'bg-amber-500/10 text-amber-600' },
                  { label: 'Pending Approvals', value: '8', change: '-3', icon: Bell, color: 'bg-rose-500/10 text-rose-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-card p-4 text-left">
                    <div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg ${stat.color}`}>
                      <stat.icon className="size-4" />
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="mt-1 text-xs text-emerald-600">{stat.change} this week</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-32 rounded-xl border border-border bg-card" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-border bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
            TRUSTED BY LEADING COMPANIES WORLDWIDE
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
            {COMPANIES.map((c) => (
              <span key={c} className="text-sm font-semibold tracking-wide text-muted-foreground/60">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                className="text-center"
              >
                <div className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">{s.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Platform Features</Badge>
            <h2 className="text-4xl font-bold tracking-tight text-balance">
              Everything you need to manage your workforce
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete HR operating system built for the modern enterprise.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
              >
                <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-6">
                    <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl ${f.color}`}>
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-bold tracking-tight">Loved by HR teams everywhere</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2} variants={fadeUp}
              >
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 flex gap-1">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}>
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.title}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border px-6">
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-12 text-white shadow-2xl shadow-primary/30"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute left-0 top-0 size-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 right-0 size-64 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <TrendingUp className="mx-auto mb-4 size-10 opacity-80" />
              <h2 className="text-4xl font-extrabold tracking-tight">Ready to transform your workforce?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg opacity-80">
                Join 1,200+ companies using WorkForce Pro to manage their most important asset — their people.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/login">
                  <Button size="lg" variant="secondary" className="gap-2 bg-white px-8 text-primary hover:bg-white/90">
                    Sign In
                    <Globe className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-muted/20 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-5">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden">
                  <img src="/hr-manager.png" alt="Logo" className="size-full object-cover" />
                </div>
                <span className="text-lg font-semibold">WorkForce<span className="text-primary">Pro</span></span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Enterprise workforce management platform powering over 50,000 employees across 1,200+ organizations worldwide.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs"><Shield className="mr-1 size-3" />SOC 2 Type II</Badge>
                <Badge variant="secondary" className="text-xs"><Award className="mr-1 size-3" />ISO 27001</Badge>
              </div>
            </div>
            {[
              {
                title: 'Product',
                links: ['Features', 'Changelog', 'Roadmap', 'API Docs'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Press', 'Partners'],
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Security', 'GDPR', 'Cookie Policy'],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-sm font-semibold">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="my-10" />
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} WorkForce Pro, Inc. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
