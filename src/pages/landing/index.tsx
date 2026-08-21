import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Users, Clock, Calendar, BarChart3, Shield, Zap, Globe, Award,
  ChevronRight, Check, Star, ArrowRight, Building2, TrendingUp,
  Menu, X, Brain, Bell, FileText, Layers, MapPin, Sparkles,
  ShieldCheck, CheckCircle2, Lock, Cpu, Eye, QrCode, FileCheck2,
  Scale, FileSpreadsheet, Activity, RefreshCw, UserCheck, AlertTriangle,
  Smartphone, Database, CheckSquare, Compass
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModeToggle } from '@/components/mode-toggle'

const NAV_LINKS = [
  { label: 'Platform Overview', href: '#overview' },
  { label: 'Core Capabilities', href: '#capabilities' },
  { label: 'DOLE Compliance', href: '#dole-compliance' },
  { label: 'Feature Ecosystem', href: '#features' },
  { label: 'Security & Trust', href: '#security' },
  { label: 'FAQ', href: '#faq' },
]

const STATS = [
  { value: '50,000+', label: 'Verified Timecards Logged', desc: 'Real-time biometric & GPS sync' },
  { value: '100%', label: 'DOLE Statutory Compliance', desc: 'Labor Code Art. 94 & Form 48 DTR' },
  { value: '0.28s', label: 'Facial Biometric Match', desc: 'AI visual landmark validation' },
  { value: '99.98%', label: 'Enterprise System Uptime', desc: 'Supabase PostgreSQL + Edge DB' },
]

const PILLARS = [
  {
    id: 'geofence',
    title: 'Spatial GPS & Biometrics',
    subtitle: 'Zero-Fraud Attendance',
    icon: MapPin,
    badge: 'Hardware-Grade Anti-Spoof',
    color: 'from-blue-500/20 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description: 'Enforce strict 100m radial office bounds with real-time browser GPS mapping and AI facial recognition to eliminate buddy punching.',
    highlights: ['Interactive Leaflet radar map', 'Anti-spoofing travel speed detector', 'Live camera biometric AI matching'],
  },
  {
    id: 'dole',
    title: 'Philippine DOLE Compliance',
    subtitle: 'Labor Code Art. 94 Engine',
    icon: Scale,
    badge: 'Official Form 48 DTR',
    color: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'Built-in database of all 2025–2027 Regular & Special Philippine Holidays with automated 200% double pay and 130% premium wage rules.',
    highlights: ['Civil Service Form No. 48 DTR', 'Gender-smart maternity & paternity leaves', '13th Month statutory pay ledger'],
  },
  {
    id: 'ai-engine',
    title: 'Gemini AI Intelligence',
    subtitle: 'Autonomous HR Operations',
    icon: Brain,
    badge: 'Powered by Google Gemini',
    color: 'from-purple-500/20 to-violet-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    description: 'Harness enterprise generative AI to audit roster health, evaluate leave policies, draft corporate memos, and generate executive reports.',
    highlights: ['1-Click Schedule gap auditor', 'Automated leave policy recommendations', 'Anonymous 360° appraisal engine'],
  },
  {
    id: 'enterprise-ops',
    title: 'Enterprise Logistics & Payroll',
    subtitle: 'End-to-End Workforce Management',
    icon: FileSpreadsheet,
    badge: 'Print-Ready Formats',
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'High-speed bulk roster management, instant A4 printable DOLE payslips with SSS/PhilHealth/Pag-IBIG deductions, and CR80 ID badges.',
    highlights: ['High-speed bulk roster clear/fill', 'Printable A4 DOLE payslips with barcode', 'Printable CR80 ID badges with QR'],
  },
]

const FEATURE_GRID = [
  {
    icon: Clock,
    tag: 'Attendance & Timekeeping',
    title: 'Biometric & GPS Radar Timeclock',
    desc: 'Real-time clock in/out protected by strictly enforced GPS Geofencing (with Live Radar Maps) and Face Recognition biometrics.',
    gradient: 'from-blue-500/10 to-indigo-500/5',
    iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  },
  {
    icon: Scale,
    tag: 'Labor Law Compliance',
    title: 'Philippine Holidays & Wage Multipliers',
    desc: 'Automated 200% Regular Holiday double pay and 130% Special Non-Working Day rates with direct DOLE Form 48 DTR export.',
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  },
  {
    icon: Calendar,
    tag: 'Roster & Scheduling',
    title: 'Bulk Roster Manager & AI Gap Audit',
    desc: 'Wipe or generate monthly schedules in milliseconds with high-performance batch operations and AI shift coverage auditing.',
    gradient: 'from-emerald-500/10 to-teal-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: ShieldCheck,
    tag: 'Statutory Benefits',
    title: 'Gender-Aware Leave Engine',
    desc: 'Guaranteed compliance with RA 11210 (105-Day Maternity), RA 8187 (Paternity), RA 9262 (VAWC), and in-app medical cert preview.',
    gradient: 'from-rose-500/10 to-pink-500/5',
    iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
  },
  {
    icon: FileText,
    tag: 'Enterprise Documents',
    title: 'Printable DOLE Payslips & ID Badges',
    desc: 'Instant 1-click A4 Printable PDF Payslips with automated Philippine tax deductions, and CR80 Printable Employee Badges with barcodes.',
    gradient: 'from-violet-500/10 to-purple-500/5',
    iconColor: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  },
  {
    icon: UserCheck,
    tag: 'Performance Management',
    title: 'Blind 360° Appraisals & Merits',
    desc: 'Evaluator identity masking protects staff feedback integrity, paired with an immutable Merit Bonus ledger and performance scores.',
    gradient: 'from-sky-500/10 to-cyan-500/5',
    iconColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  },
]

const DOLE_COMPLIANCE_ITEMS = [
  {
    code: 'Labor Code Art. 94 / RA 9492',
    name: 'Regular Holiday 200% Pay Rule',
    desc: 'Guarantees 100% base compensation for unworked regular holidays and 200% double pay (+30% on rest days) when clocked in.',
    type: 'Regular Holiday',
  },
  {
    code: 'Executive Proclamations',
    name: 'Special Non-Working Day (130%)',
    desc: 'Implements the "No Work, No Pay" rule while computing 130% premium pay (+50% on rest days) for scheduled staff.',
    type: 'Special Day',
  },
  {
    code: 'RA 11210 / SSS Guidelines',
    name: '105-Day Expanded Maternity Leave',
    desc: 'Enforces 105 paid calendar days with optional 30-day extension, restricted to qualified female workforce profiles.',
    type: 'Statutory Leave',
  },
  {
    code: 'RA 8187 / DOLE Handbook',
    name: '7-Day Paternity Leave with Pay',
    desc: 'Grants 7 paid workdays to married male employees for the first four deliveries of legitimate spouse.',
    type: 'Statutory Leave',
  },
  {
    code: 'Civil Service Form No. 48',
    name: 'Standardized Daily Time Record (DTR)',
    desc: 'Generates official A.M./P.M. arrival and departure records with signature lines for employee and certifying officer.',
    type: 'DTR Form 48',
  },
  {
    code: 'Pres. Decree No. 851',
    name: '13th Month Pay Accrual Ledger',
    desc: 'Automates pro-rated 1/12th annual basic salary computation across all active employees before December 24 deadline.',
    type: 'Mandatory Bonus',
  },
]

const TESTIMONIALS = [
  {
    name: 'Capt. Eduardo Santos',
    title: 'Operations Director, Manila Port Logistics Hub',
    avatar: 'ES',
    rating: 5,
    text: 'Priority Handling Logistics, Inc. transformed our daily dispatch timecards. With strict GPS geofencing and instant facial verification, buddy punching dropped to absolute zero.',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'Atty. Ma. Cristina Reyes',
    title: 'VP of Human Resources & DOLE Compliance',
    avatar: 'CR',
    rating: 5,
    text: 'The built-in Philippine Holiday engine and Civil Service Form 48 export saved our payroll team dozens of auditing hours every pay period. 100% compliant with DOLE Labor Code.',
    color: 'from-amber-600 to-rose-600',
  },
  {
    name: 'Engr. Jerome Villanueva',
    title: 'Chief Technology Officer, Pacific Express Fleet',
    avatar: 'JV',
    rating: 5,
    text: 'The Gemini AI Roster Health auditor caught coverage blindspots during peak holiday surges before they became operational disruptions. It is truly an elite platform.',
    color: 'from-emerald-600 to-teal-600',
  },
]

const FAQS = [
  {
    q: 'How does the GPS Geofencing and Face Recognition work during clock in?',
    a: 'When an employee clocks in via browser or mobile, the system queries high-accuracy device GPS to confirm their distance from the hub (default 100m). Simultaneously, our biometric vision engine validates live webcam landmarks against enrolled employee facial encodings, guaranteeing identity in under 300ms.',
  },
  {
    q: 'How are Philippine Holidays and DOLE Wage Multipliers calculated?',
    a: 'The system has an embedded statutory calendar for 2025–2027. On Regular Holidays (Labor Code Art. 94), employees receive 100% pay if unworked and 200% double pay if clocked in. On Special Non-Working Days, the "No Work, No Pay" rule applies while clocked-in employees receive 130% premium pay.',
  },
  {
    q: 'Can supervisors generate official Civil Service Form 48 DTRs and DOLE Payslips?',
    a: 'Yes. Every employee profile and monthly attendance summary includes 1-click printable DOLE Form 48 DTR tables with A.M./P.M. arrival/departure, regular hours, overtime, and certifying signatures. You can also print official A4 PDF payslips with SSS, PhilHealth, and Pag-IBIG itemizations.',
  },
  {
    q: 'How does the Gender-Smart Statutory Leave system protect compliance?',
    a: 'Employee profiles store gender classification. When applying for statutory leaves, options like 105-Day Maternity (RA 11210) and VAWC (RA 9262) are exclusively accessible to female staff, while Paternity (RA 8187) is provisioned for male staff, backed by automatic SSS document requirement prompts.',
  },
  {
    q: 'What role does Google Gemini AI play in this platform?',
    a: 'Google Gemini powers four specialized workforce tools: (1) Roster Health Auditor that identifies understaffed shifts, (2) AI Policy Evaluator that analyzes leave applications, (3) AI Corporate Memo Writer that drafts official announcements, and (4) Natural Language Executive Query Analytics.',
  },
  {
    q: 'Is there role-based access control (RBAC) and evaluator identity masking?',
    a: 'Yes. The system enforces strict Supabase Row-Level Security (RLS) across 5 hierarchical roles: Super Admin, HR Manager, Team Supervisor, Employee, and Dispatcher. In performance appraisals, evaluator identities are masked from employees to safeguard review honesty.',
  },
]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* TOP ANNOUNCEMENT BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-2 text-center text-xs font-medium text-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="flex size-4 items-center justify-center rounded-full bg-blue-500/30 text-[10px]">🇵🇭</span>
          <span>
            <strong>DOLE 2026 Ready:</strong> Fully automated Philippine Statutory Holidays, Civil Service Form 48 DTRs, and Gender-Smart Statutory Leaves.
          </span>
          <Link to="/login" className="ml-2 underline underline-offset-2 hover:text-blue-200 hidden sm:inline-block">
            Launch Workspace →
          </Link>
        </div>
      </div>

      {/* STICKY GLASS NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-xl overflow-hidden shadow-xs ring-1 ring-primary/30 group-hover:scale-105 transition-transform">
              <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground leading-none">
                Priority Handling
              </span>
              <span className="text-[10px] font-semibold text-primary tracking-wider uppercase">
                Logistics Workforce OS
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="gap-1.5 text-xs font-bold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                <Sparkles className="size-3.5" />
                <span>Console</span>
              </Button>
            </Link>
            <button
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-border bg-background/95 backdrop-blur-xl px-6 py-4 lg:hidden"
            >
              <nav className="flex flex-col gap-3">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    className="text-sm font-medium py-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
                <Separator className="my-2" />
                <div className="flex items-center gap-3">
                  <Link to="/login" className="w-full" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full text-xs font-bold">Access Enterprise Portal</Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section id="overview" className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 size-[750px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-10 top-1/3 size-[450px] rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="absolute left-10 bottom-10 size-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-6xl px-6 text-center">
          {/* Eyebrow badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md"
          >
            <Sparkles className="size-3.5 animate-pulse" />
            <span>Next-Gen Workforce Intelligence & DOLE Compliance OS</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold">v2.6.4</span>
          </motion.div>

          {/* Main Hero Headline */}
          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-4xl font-extrabold tracking-tight text-balance sm:text-6xl md:text-7xl lg:leading-[1.1]"
          >
            Enterprise Workforce Management
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-violet-500 to-indigo-400 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-300 dark:to-indigo-300">
              Built for Absolute Precision
            </span>
          </motion.h1>

          {/* Hero Subcopy */}
          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            The unified operational platform designed for high-velocity logistics and enterprise teams.
            Combining <strong>Hardware-Grade GPS Geofencing</strong>, <strong>Biometric AI Verification</strong>,
            <strong> Philippine DOLE Statutory Holiday & Form 48 DTR Automation</strong>, and <strong>Google Gemini AI Roster Auditing</strong>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
          >
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 px-8 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
                <span>Launch Enterprise Workspace</span>
                <ChevronRight className="size-4" />
              </Button>
            </Link>
            <a href="#capabilities" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 border-border/80 hover:bg-muted/50 font-semibold text-xs">
                <Activity className="size-4 text-primary" />
                <span>Explore Platform Capabilities</span>
              </Button>
            </a>
          </motion.div>

          {/* Key Compliance & Tech Badges */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-semibold text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 border border-border/50">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              DOLE Labor Code Art. 94 Compliant
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 border border-border/50">
              <FileCheck2 className="size-3.5 text-blue-500" />
              Civil Service Form No. 48 DTR
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 border border-border/50">
              <MapPin className="size-3.5 text-rose-500" />
              Live Radar GPS Geofence (100m)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1 border border-border/50">
              <Brain className="size-3.5 text-purple-500" />
              Google Gemini AI Engine
            </span>
          </motion.div>

          {/* HERO INTERACTIVE DASHBOARD SIMULATION MOCKUP */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
            className="mt-14 overflow-hidden rounded-2xl border border-border/80 bg-card/70 shadow-2xl shadow-primary/10 backdrop-blur-md text-left"
          >
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-border/70 bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-rose-500/80" />
                <div className="size-3 rounded-full bg-amber-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 hidden sm:inline-block rounded-md bg-background/80 px-3 py-1 font-mono text-[11px] text-muted-foreground border border-border/50">
                  https://app.priorityhandling.com/live-operations
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Hub Telemetry Active</span>
              </div>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Active On-Duty Staff', val: '248 / 256', sub: '96.8% Hub Presence', icon: Users, col: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'Today\'s DOLE Rate', val: '200% Double Pay', sub: 'National Heroes Day (REG)', icon: Scale, col: 'text-blue-600 bg-blue-500/10' },
                  { label: 'GPS Radar Accuracy', val: '±2.4 meters', sub: 'Hub Center (100m Bound)', icon: MapPin, col: 'text-rose-600 bg-rose-500/10' },
                  { label: 'AI Roster Status', val: '100% Optimal', sub: '0 Coverage Conflicts', icon: Brain, col: 'text-purple-600 bg-purple-500/10' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/60 bg-card p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-muted-foreground truncate">{s.label}</span>
                      <div className={`p-1.5 rounded-lg ${s.col}`}>
                        <s.icon className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground">{s.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Central Visual Showcase: Split Radar and Timecard */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Radar Mockup */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-blue-500 animate-spin" style={{ animationDuration: '8s' }} />
                      <span className="text-xs font-bold">Spatial GPS Radar Bound</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                      Geofence: 100m
                    </Badge>
                  </div>

                  {/* Simulated Radar Circle */}
                  <div className="relative mx-auto my-2 size-36 sm:size-40 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center shadow-inner">
                    <div className="absolute size-24 rounded-full border border-dashed border-primary/40" />
                    <div className="absolute size-12 rounded-full border border-primary/60 bg-primary/10" />
                    <div className="size-3 rounded-full bg-primary ring-4 ring-primary/30" />
                    {/* Pulsing targets */}
                    <div className="absolute top-8 left-10 size-2 rounded-full bg-emerald-500 animate-ping" />
                    <div className="absolute bottom-10 right-8 size-2 rounded-full bg-blue-500 animate-pulse" />
                    <div className="absolute top-12 right-12 size-2 rounded-full bg-emerald-500" />
                  </div>

                  <div className="rounded-lg bg-background/80 p-2.5 text-[11px] border border-border/50 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Dispatch Hub Coordinates:</span>
                      <span className="font-mono text-primary">14.5995° N, 120.9842° E</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Live Status:</span>
                      <span className="text-emerald-600 font-bold">● Strict Geofencing Enforced</span>
                    </div>
                  </div>
                </div>

                {/* DOLE Form 48 DTR Table Preview */}
                <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Civil Service Form No. 48 DTR (Live DOLE Stream)</h4>
                      <p className="text-[10px] text-muted-foreground">Daily Time Record with Philippine Holiday multipliers</p>
                    </div>
                    <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                      DOLE Art. 94 Auto-Pay
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                          <th className="py-1.5 px-2">Day / Date</th>
                          <th className="py-1.5 px-2">A.M. In</th>
                          <th className="py-1.5 px-2">P.M. Out</th>
                          <th className="py-1.5 px-2">Hours</th>
                          <th className="py-1.5 px-2">DOLE Statutory Classification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[10px]">
                        <tr className="bg-blue-50/50 dark:bg-blue-950/30">
                          <td className="py-1.5 px-2 font-bold text-foreground">Day 31 (Mon)</td>
                          <td className="py-1.5 px-2 text-emerald-600 font-bold">08:00 AM</td>
                          <td className="py-1.5 px-2 text-rose-600 font-bold">05:00 PM</td>
                          <td className="py-1.5 px-2 font-bold">8.0h</td>
                          <td className="py-1.5 px-2 text-blue-700 dark:text-blue-300 font-sans font-bold">
                            🇵🇭 REG HOLIDAY (200% DOUBLE PAY)
                          </td>
                        </tr>
                        <tr className="bg-amber-50/50 dark:bg-amber-950/30">
                          <td className="py-1.5 px-2 font-bold text-foreground">Day 21 (Fri)</td>
                          <td className="py-1.5 px-2 text-muted-foreground">—</td>
                          <td className="py-1.5 px-2 text-muted-foreground">—</td>
                          <td className="py-1.5 px-2 text-muted-foreground">0.0h</td>
                          <td className="py-1.5 px-2 text-amber-700 dark:text-amber-300 font-sans font-bold">
                            🇵🇭 SPEC HOLIDAY (UNPAID / NO WORK NO PAY)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-2 font-bold text-foreground">Day 20 (Thu)</td>
                          <td className="py-1.5 px-2 text-emerald-600 font-bold">07:54 AM</td>
                          <td className="py-1.5 px-2 text-rose-600 font-bold">05:02 PM</td>
                          <td className="py-1.5 px-2 font-bold">8.0h</td>
                          <td className="py-1.5 px-2 text-emerald-700 dark:text-emerald-300 font-sans font-semibold">
                            PRESENT (STANDARD SHIFT)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="size-3.5" /> Biometrics Validated (Face ID Match: 99.4%)
                    </span>
                    <Link to="/login" className="text-primary font-bold hover:underline">
                      View Full DTR Generator →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-border/50 bg-muted/30 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="text-center md:text-left"
              >
                <div className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs sm:text-sm font-bold text-foreground">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE PILLARS & CAPABILITIES */}
      <section id="capabilities" className="py-24">
        <div className="mx-auto max-w-7xl px-6 space-y-16">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3">Core Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Architected for High-Impact Logistics & Enterprise HR
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Explore the four foundational pillars powering over 50,000 workforce shifts with zero payroll discrepancies.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, idx) => (
              <Card
                key={p.id}
                className="group relative overflow-hidden border border-border/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 bg-card"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border ${p.color}`}>
                      <p.icon className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {p.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{p.subtitle}</p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>

                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    {p.highlights.map((h) => (
                      <div key={h} className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                        <Check className="size-3 text-primary shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PHILIPPINE DOLE COMPLIANCE HIGHLIGHT */}
      <section id="dole-compliance" className="border-t border-border/50 bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-6 space-y-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-4">
              <span>🇵🇭</span>
              <span>100% Philippine Statutory Labor Standards Built-In</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Strict Legal Adherence to DOLE Labor Directives
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Eliminate labor disputes, manual wage computations, and audit penalties with automatic statutory calculations codified directly into every timecard.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOLE_COMPLIANCE_ITEMS.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-border/70 bg-card p-5 space-y-2.5 shadow-2xs hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {item.code}
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    {item.type}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILED FEATURE GRID */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6 space-y-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3">Feature Ecosystem</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Complete HR & Logistics Command
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              Every tool required to operate enterprise shifts, payroll, performance, and legal compliance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURE_GRID.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.5}
                variants={fadeUp}
              >
                <Card className="h-full border border-border/80 hover:border-primary/40 hover:shadow-lg transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${f.iconColor}`}>
                        <f.icon className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.tag}</span>
                    </div>

                    <h3 className="text-base font-bold text-foreground">{f.title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY & TRUST */}
      <section id="security" className="border-t border-border/50 bg-muted/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/30">Enterprise Security</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Military-Grade Data Protection & Multi-Role Governance
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Protect sensitive employee data, payroll ledgers, and facial biometric records with state-of-the-art encryption and strict zero-trust role separation.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'PostgreSQL Row Level Security (RLS)', desc: 'Tenants and employees can only query their authorized data rows.' },
                  { title: 'Facial Biometric Landmarks Encription', desc: 'Raw photos are converted to secure vectors; no raw biometric files are exposed.' },
                  { title: 'Dual-Factor Magic Link for Leadership', desc: 'Super Admins and HR Managers are gated by cryptographic email tokens.' },
                  { title: 'Tamper-Proof Audit Trails', desc: 'Every timecard edit, schedule wipe, and payroll issuance is permanently logged.' },
                ].map((sec) => (
                  <div key={sec.title} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600 mt-0.5">
                      <Check className="size-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{sec.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{sec.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <span className="text-xs font-bold flex items-center gap-2">
                  <Lock className="size-3.5 text-primary" /> Security & Role Governance Matrix
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  RLS Active
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { role: 'Super Admin', perms: 'Unrestricted System & Audit Governance', color: 'text-purple-600 bg-purple-500/10' },
                  { role: 'HR Manager', perms: 'DOLE Form 48 DTR, Payroll & Policy Controls', color: 'text-blue-600 bg-blue-500/10' },
                  { role: 'Team Supervisor', perms: 'Shift Scheduling & Direct Team Approvals', color: 'text-amber-600 bg-amber-500/10' },
                  { role: 'Logistics Staff', perms: 'GPS Geofence Clock In & Leave Requests', color: 'text-emerald-600 bg-emerald-500/10' },
                ].map((r) => (
                  <div key={r.role} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${r.color}`}>{r.role}</span>
                    <span className="text-[11px] text-muted-foreground">{r.perms}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6 space-y-14">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3">Industry Endorsements</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trusted by Operational Leaders</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.2}
                variants={fadeUp}
              >
                <Card className="h-full border border-border/80">
                  <CardContent className="flex h-full flex-col p-6 space-y-4">
                    <div className="flex gap-1">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">"{t.text}"</p>
                    <div className="pt-3 border-t border-border/50 flex items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white shadow-xs`}>
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground">{t.title}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="faq" className="border-t border-border/50 bg-muted/20 py-24">
        <div className="mx-auto max-w-3xl px-6 space-y-12">
          <div className="text-center">
            <Badge variant="secondary" className="mb-3">Questions & Answers</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/80 bg-card px-5">
                <AccordionTrigger className="text-left text-xs sm:text-sm font-semibold hover:no-underline py-4">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-4 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 p-10 sm:p-14 text-white shadow-2xl">
            <div className="relative z-10 mx-auto max-w-2xl text-center space-y-6">
              <Sparkles className="mx-auto size-10 text-blue-400 animate-pulse" />
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Ready to Experience Next-Gen Workforce Intelligence?
              </h2>
              <p className="text-sm sm:text-base text-blue-100/80 leading-relaxed">
                Join forward-thinking logistics hubs and enterprises powered by Priority Handling Logistics, Inc.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto font-bold bg-white text-slate-900 hover:bg-white/90 gap-2 shadow-lg">
                    <span>Access System Console</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-6 space-y-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden ring-1 ring-primary/30">
                  <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
                </div>
                <span className="text-base font-bold text-foreground">Priority Handling Logistics, Inc.</span>
              </Link>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Next-generation enterprise workforce management platform. Built to standard DOLE Philippine Labor Codes, biometric facial landmark validation, and high-precision GPS geofencing.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">🇵🇭 DOLE Labor Code Art. 94</Badge>
                <Badge variant="outline" className="text-[10px]">Form 48 DTR Ready</Badge>
              </div>
            </div>

            {[
              {
                title: 'Platform Modules',
                links: ['Attendance & Geofencing', 'Roster & Scheduling', 'DOLE Form 48 DTR', 'Payroll & Payslips', 'Performance Appraisals'],
              },
              {
                title: 'DOLE Compliance',
                links: ['Regular Holidays (200%)', 'Special Non-Working (130%)', '105-Day Maternity (RA 11210)', '7-Day Paternity (RA 8187)', '13th Month Pay Ledger'],
              },
              {
                title: 'System & Security',
                links: ['Row Level Security (RLS)', 'Facial Biometric Engine', 'GPS Radar Bounds', 'Super Admin Governance', 'Audit Logs'],
              },
            ].map((col) => (
              <div key={col.title} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{col.title}</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {col.links.map((item) => (
                    <li key={item}>
                      <Link to="/login" className="hover:text-foreground transition-colors">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Priority Handling Logistics, Inc. All rights reserved.</span>
            <div className="flex items-center gap-4 font-medium">
              <Link to="/login" className="hover:text-foreground">Log In</Link>
              <span>•</span>
              <a href="#overview" className="hover:text-foreground">Back to Top</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
