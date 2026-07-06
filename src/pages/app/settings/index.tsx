import { useState, useEffect } from 'react'
import { Building2, Bell, Shield, Palette, Globe, Key, Save, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ModeToggle } from '@/components/mode-toggle'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { employee, updateProfile, updatePassword } = useAuthStore()
  const { can } = usePermissions()

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const defaultNotifs = { email: true, push: true, slack: false, leaveApprovals: true, attendanceAlerts: true, announcements: true }
  type NotifsState = typeof defaultNotifs
  const [notifs, setNotifs] = useState<NotifsState>(() => {
    try {
      const saved = localStorage.getItem('wms-notif-prefs')
      if (saved) return JSON.parse(saved) as NotifsState
    } catch {}
    return defaultNotifs
  })

  useEffect(() => {
    if (employee) {
      setProfile({
        first_name: employee.first_name ?? '',
        last_name: employee.last_name ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        position: employee.position ?? '',
      })
    }
  }, [employee?.id])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    const { error } = await updateProfile(profile)
    setIsSavingProfile(false)
    if (error) toast.error('Failed to save profile', { description: error })
    else toast.success('Profile updated successfully')
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (passwords.newPass.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsSavingPassword(true)
    const { error } = await updatePassword(passwords.current, passwords.newPass)
    setIsSavingPassword(false)
    if (error) toast.error('Failed to update password', { description: error })
    else {
      toast.success('Password updated successfully')
      setPasswords({ current: '', newPass: '', confirm: '' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and system preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="size-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="size-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="size-3.5" />Security</TabsTrigger>
          <TabsTrigger value="organization" className="gap-1.5"><Building2 className="size-3.5" />Organization</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="size-3.5" />Appearance</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your personal details and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 rounded-2xl">
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-lg font-bold text-primary">
                      {`${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{profile.first_name} {profile.last_name}</p>
                    <p className="text-xs text-muted-foreground">{employee?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={profile.first_name}
                      onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={profile.last_name}
                      onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1-555-0100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={profile.position}
                      onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                      placeholder="Your position"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input value={employee?.departments?.name ?? '—'} disabled className="bg-muted/50" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSavingProfile} className="gap-1.5">
                    {isSavingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Channels</h3>
                {[
                  { key: 'email', label: 'Email notifications', desc: 'Receive updates in your inbox' },
                  { key: 'push', label: 'Push notifications', desc: 'Browser and mobile push alerts' },
                  { key: 'slack', label: 'Slack integration', desc: 'Get notified in your Slack workspace' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifs[item.key as keyof typeof notifs] as boolean}
                      onCheckedChange={v => setNotifs(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Event Types</h3>
                {[
                  { key: 'leaveApprovals', label: 'Leave approvals', desc: 'When your leave requests are processed' },
                  { key: 'attendanceAlerts', label: 'Attendance alerts', desc: 'Clock-in reminders and absence flags' },
                  { key: 'announcements', label: 'Announcements', desc: 'Company-wide news and updates' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifs[item.key as keyof typeof notifs] as boolean}
                      onCheckedChange={v => setNotifs(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => {
                  localStorage.setItem('wms-notif-prefs', JSON.stringify(notifs))
                  toast.success('Notification preferences saved')
                }} className="gap-1.5">
                  <Save className="size-4" />Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current_pw">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current_pw"
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={passwords.current}
                        onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPasswords(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new_pw">New Password</Label>
                      <Input
                        id="new_pw"
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={passwords.newPass}
                        onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm_pw">Confirm Password</Label>
                      <Input
                        id="confirm_pw"
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={passwords.confirm}
                        onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                      />
                    </div>
                  </div>
                  {passwords.newPass && passwords.confirm && passwords.newPass !== passwords.confirm && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSavingPassword || !passwords.current || !passwords.newPass}
                      className="gap-1.5"
                    >
                      {isSavingPassword ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Authenticator App (TOTP)</p>
                  <p className="text-xs text-muted-foreground">Use Google Authenticator or similar</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Not configured</Badge>
                  <Button variant="outline" size="sm" onClick={() => toast.info('2FA setup coming soon')}>Setup 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organization */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary">
                  <Building2 className="size-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">WorkForce Pro</p>
                  <p className="text-sm text-muted-foreground">Enterprise Plan</p>
                </div>
                <Badge>Enterprise</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Employee ID</Label>
                  <Input value={employee?.employee_id ?? '—'} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={employee?.role?.replace(/_/g, ' ') ?? '—'} disabled className="bg-muted/50 capitalize" />
                </div>
                <div className="space-y-1.5">
                  <Label>Employment Type</Label>
                  <Input value={employee?.employment_type?.replace('_', ' ') ?? '—'} disabled className="bg-muted/50 capitalize" />
                </div>
                <div className="space-y-1.5">
                  <Label>Hire Date</Label>
                  <Input value={employee?.hire_date ?? '—'} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Work Week</Label>
                  <Select defaultValue="mon-fri" disabled={!can.manageSettings()}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mon-fri">Monday – Friday</SelectItem>
                      <SelectItem value="mon-sat">Monday – Saturday</SelectItem>
                      <SelectItem value="sun-thu">Sunday – Thursday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Default Timezone</Label>
                  <Select defaultValue="UTC" disabled={!can.manageSettings()}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize how WorkForce Pro looks for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Theme</Label>
                <div className="flex items-center gap-3">
                  <ModeToggle />
                  <span className="text-sm text-muted-foreground">Toggle between light and dark mode</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="w-48">
                    <Globe className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (US)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Appearance preferences saved')} className="gap-1.5">
                  <Save className="size-4" />Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
