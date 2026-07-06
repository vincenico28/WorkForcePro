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

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !firstName || !lastName) {
      toast.error('All fields are required')
      return
    }

    setIsLoading(true)
    const { error } = await signUp(email, password, firstName, lastName)
    setIsLoading(false)

    if (error) {
      toast.error('Registration failed', { description: error })
    } else {
      toast.success('Account created successfully!', {
        description: 'You can now sign in with your credentials.',
      })
      navigate('/login')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-sidebar via-sidebar to-primary/30 p-12 lg:flex lg:w-[45%]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            WorkForce<span className="text-sidebar-primary">Pro</span>
          </span>
        </Link>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-extrabold leading-tight text-sidebar-foreground">
              Empower your career with WorkForce Pro
            </h1>
            <p className="mt-4 text-sidebar-foreground/70">
              Join your team, manage schedules, request leaves, track your timesheets, and view performance insights in one unified dashboard.
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

        <p className="text-xs text-sidebar-foreground/40">© 2025 WorkForce Pro, Inc.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link
          to="/login"
          className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="size-3.5" />
          Back to login
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="flex items-center justify-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
                <Building2 className="size-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                WorkForce<span className="text-primary">Pro</span>
              </span>
            </Link>
          </div>

          <Card className="border-border shadow-xl shadow-black/5">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>Get started as an employee today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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
                  Sign Up
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border py-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
