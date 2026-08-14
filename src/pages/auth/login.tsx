import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Building2, Loader2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
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
    if (!email || !password) return
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
      // Automatically mandate Magic Link authentication for higher-ups
      await useAuthStore.getState().signOut()
      const { error: otpError } = await supabase.auth.signInWithOtp({ email })
      setIsLoading(false)

      if (otpError) {
        toast.error('Failed to send secure login link', { description: otpError.message })
        return
      }

      setOtpSent(true)
      toast.success('Security Notice', { 
        description: 'Management accounts require Magic Link authentication. A secure login link has been sent to your email.' 
      })
      return
    }

    // Regular employee login proceeds directly to dashboard
    setIsLoading(false)
    navigate('/app/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-sidebar via-sidebar to-primary/30 p-12 lg:flex lg:w-[45%]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden">
            <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">Priority Handling Logistics,Inc.</span>
        </Link>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-extrabold leading-tight text-sidebar-foreground">
              The intelligent platform for modern workforce management
            </h1>
            <p className="mt-4 text-sidebar-foreground/70">
              Streamline HR operations, boost productivity, and make data-driven decisions with AI-powered insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '50K+', label: 'Employees' },
              { value: '99.9%', label: 'Uptime' },
              { value: '1,200+', label: 'Companies' },
              { value: '4.9★', label: 'Rating' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold text-sidebar-foreground">{s.value}</div>
                <div className="text-xs text-sidebar-foreground/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">© 2026 Priority Handling Logistics, Inc.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden">
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="flex items-center justify-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl overflow-hidden">
                <img src="/Favicon.wf.gif" alt="Logo" className="size-full object-cover" />
              </div>
              <span className="text-xl font-bold">Priority Handling Logistics,Inc.</span>
            </Link>
          </div>

          <Card className="border-border shadow-xl shadow-black/5">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">
                {otpSent ? 'Check your email' : 'Welcome back'}
              </CardTitle>
              <CardDescription>
                {otpSent 
                  ? 'We sent a secure magic link to sign in to your administrator account' 
                  : 'Sign in to your Priority Handling Logistics,Inc. account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {otpSent ? (
                <div className="space-y-6 text-center py-2">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="size-7" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      A login link has been sent to:
                    </p>
                    <p className="font-semibold text-primary">{email}</p>
                    <p className="text-xs text-muted-foreground pt-2">
                      Higher-level management accounts require email verification for enhanced security. Click the link in your email to access the dashboard.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={async () => {
                        setIsLoading(true)
                        const { error } = await supabase.auth.signInWithOtp({ email })
                        setIsLoading(false)
                        if (error) {
                          toast.error('Resend failed', { description: error.message })
                        } else {
                          toast.success('Magic link resent!')
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
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
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="pr-10"
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

                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Sign In
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
