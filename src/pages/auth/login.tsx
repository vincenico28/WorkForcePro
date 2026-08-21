import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, Building2, Loader2, ArrowLeft, ShieldCheck,
  Lock, Mail, Sparkles, UserCheck, MapPin, Scale, ArrowRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModeToggle } from '@/components/mode-toggle'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Missing credentials', { description: 'Please enter your email and password.' })
      return
    }
    setIsLoading(true)

    // Authenticate user with their credentials
    const { error } = await signIn(email, password)

    if (error) {
      setIsLoading(false)
      toast.error('Sign in failed', { description: error })
      return
    }

    // Check if the account belongs to a higher-up / management role
    const currentEmp = useAuthStore.getState().employee
    const isHigherUp = currentEmp && ['super_admin', 'admin', 'hr_manager', 'team_supervisor'].includes(currentEmp.role)

    if (isHigherUp) {
      // Immediately switch UI to OTP notice screen without delay
      setOtpSent(true)
      setIsLoading(false)
      toast.info('Security Notice', {
        description: 'Management accounts require Magic Link authentication. Sending secure link to your email...'
      })

      // Asynchronously complete sign out and dispatch the Magic Link OTP
      try {
        await useAuthStore.getState().signOut()
        const { error: otpError } = await supabase.auth.signInWithOtp({ email })
        if (otpError) {
          toast.error('Failed to send secure login link', { description: otpError.message })
        } else {
          toast.success('Security Notice', {
            description: 'Management accounts require Magic Link authentication. A secure login link has been sent to your email.'
          })
        }
      } catch (err: any) {
        toast.error('Failed to dispatch secure link', { description: err.message })
      }
      return
    }

    // Regular employee login proceeds directly to dashboard
    setIsLoading(false)
    toast.success('Welcome back!', { description: 'Successfully authenticated.' })
    navigate('/app/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* LEFT SHOWCASE PANEL (Desktop) */}
      <div className="hidden relative flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-12 lg:flex lg:w-[48%] xl:w-[45%] text-white overflow-hidden border-r border-border/40">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 size-96 rounded-full bg-violet-600/15 blur-[120px]" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-xl overflow-hidden shadow-xs ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none">
                Priority Handling
              </span>
              <span className="text-[10px] font-semibold text-blue-400 tracking-wider uppercase">
                Logistics Workforce OS
              </span>
            </div>
          </Link>

          <Link to="/" className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="size-3.5" />
            <span>Return to Landing</span>
          </Link>
        </div>

        {/* Center narrative & live feature chips */}
        <div className="relative z-10 space-y-8 my-auto py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 backdrop-blur-md px-3 py-1 text-xs">
              <Sparkles className="mr-1.5 size-3 text-blue-300" />
              Unified Enterprise Command Console
            </Badge>

            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
              Autonomous Logistics & DOLE Workforce Compliance
            </h1>
            <p className="text-sm leading-relaxed text-white/70">
              Access real-time biometric timecards, GPS radar geofencing, automated DOLE Form 48 DTR generation, and Gemini AI roster optimization.
            </p>
          </motion.div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'DOLE Form 48 DTR', desc: 'Auto 200% & 130% Holiday Pay', icon: Scale, col: 'text-amber-400' },
              { title: 'GPS Radar Geofence', desc: '100m Hardware Bounds', icon: MapPin, col: 'text-rose-400' },
              { title: 'Facial Biometric AI', desc: 'Zero-Fraud Identity Match', icon: UserCheck, col: 'text-emerald-400' },
              { title: 'Gemini AI Core', desc: 'Roster Health & Policy Audit', icon: Sparkles, col: 'text-purple-400' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2">
                  <f.icon className={`size-4 ${f.col}`} />
                  <span className="text-xs font-bold text-white">{f.title}</span>
                </div>
                <p className="text-[11px] text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Telemetry pill */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-white/90">PostgreSQL Security Engine Active</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-300">RLS 100% ENFORCED</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
          <span>© {new Date().getFullYear()} Priority Handling Logistics, Inc.</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            DOLE Labor Code Art. 94 Compliant
          </span>
        </div>
      </div>

      {/* RIGHT AUTHENTICATION PANEL */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
        {/* Mobile Header Nav */}
        <div className="w-full max-w-md flex items-center justify-between mb-8 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl overflow-hidden ring-1 ring-primary/30">
              <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
            </div>
            <span className="font-bold text-sm">Priority Handling Logistics</span>
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Home
            </Link>
          </div>
        </div>

        {/* Top right theme switcher on desktop */}
        <div className="absolute top-6 right-6 hidden lg:block">
          <ModeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          <Card className="border-border/80 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {otpSent ? 'Check Your Email' : 'System Sign In'}
                </CardTitle>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  {otpSent ? <Mail className="size-5" /> : <Lock className="size-5" />}
                </div>
              </div>
              <CardDescription className="text-xs">
                {otpSent
                  ? 'We dispatched a cryptographic Magic Link to your corporate inbox.'
                  : 'Enter your credentials to access your organization dashboard.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {otpSent ? (
                <div className="space-y-5 text-center py-2">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                    <Building2 className="size-8 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      A high-security login token was dispatched to:
                    </p>
                    <p className="font-mono text-sm font-bold text-primary bg-muted/60 p-2 rounded-lg border border-border/60">
                      {email}
                    </p>
                    <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                      Super Admin & HR Management roles enforce two-factor verification. Click the secure link in your email to authenticate immediately.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs font-semibold"
                      onClick={async () => {
                        setIsLoading(true)
                        const { error } = await supabase.auth.signInWithOtp({ email })
                        setIsLoading(false)
                        if (error) {
                          toast.error('Resend failed', { description: error.message })
                        } else {
                          toast.success('Magic link resent to your email!')
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Mail className="mr-1.5 size-3.5" />}
                      Resend Magic Link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => setOtpSent(false)}
                    >
                      Use another account
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">Corporate Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="employee@priorityhandling.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Password input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                      <Link to="/forgot-password" className="text-[11px] text-primary hover:underline font-semibold">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="pl-9 pr-10 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full font-bold shadow-md shadow-primary/20" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-1.5 size-4" />
                    )}
                    <span>Sign In to Console</span>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground">
            Protected by Supabase Row Level Security & DOLE Compliance Standard.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
