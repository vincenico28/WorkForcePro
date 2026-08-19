import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, Calendar, Briefcase, Clock, Edit,
  Building2, Camera, IdCard, Printer, Download, ShieldCheck,
  ShieldAlert, DollarSign, HeartHandshake, FileText, Copy,
  CheckCircle2, AlertTriangle, Sparkles, UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { useEmployee, useUpdateEmployee } from '@/hooks/use-employees'
import { useEmployeeAttendance } from '@/hooks/use-attendance'
import { useDepartments } from '@/hooks/use-misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FaceRegistration } from '@/components/face-recognition/FaceRegistration'
import { toast } from 'sonner'
import type { EmployeeRole, EmploymentType } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  on_leave: { label: 'On Leave', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
}

const EMPLOYMENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  full_time: { label: 'Full Time (Regular)', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' },
  probationary: { label: 'Probationary (6 mos)', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300' },
  contract: { label: 'Contractual / Project', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300' },
  part_time: { label: 'Part Time', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300' },
  intern: { label: 'Intern / OJT', className: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300' },
}

const ATT_STATUS_CONFIG: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  holiday: 'bg-blue-100 text-blue-700',
  half_day: 'bg-purple-100 text-purple-700',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr_manager: 'HR Manager',
  team_supervisor: 'Supervisor',
  employee: 'Employee',
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: employee, isLoading, refetch } = useEmployee(id!)
  const { data: attendance } = useEmployeeAttendance(id!, 14)
  const { data: departments } = useDepartments()
  const { mutateAsync: updateEmployee, isPending: isSaving } = useUpdateEmployee()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'unspecified',
    position: '',
    department_id: '',
    role: 'employee' as EmployeeRole,
    employment_type: 'full_time' as EmploymentType,
    hire_date: '',
    base_salary: '',
    sss_no: '',
    philhealth_no: '',
    pagibig_no: '',
    tin_no: '',
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    address: '',
    city: '',
  })

  const [idCardOpen, setIdCardOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !employee) return
    const file = e.target.files[0]
    setUploadingAvatar(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${employee.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      await updateEmployee({
        id: employee.id,
        avatar_url: data.publicUrl
      })

      toast.success('Avatar photo updated successfully!')
      refetch()
    } catch (err: any) {
      toast.error('Error uploading avatar', { description: err.message })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const openEdit = () => {
    if (!employee) return
    const sal = (employee.salary_info as any) || {}
    const emg = (employee.emergency_contact as any) || {}

    setEditForm({
      first_name: employee.first_name,
      last_name: employee.last_name ?? '',
      email: employee.email,
      phone: employee.phone ?? '',
      gender: employee.gender || 'unspecified',
      position: employee.position ?? '',
      department_id: employee.department_id ?? '',
      role: employee.role,
      employment_type: employee.employment_type ?? 'full_time',
      hire_date: employee.hire_date || (employee.created_at ? employee.created_at.split('T')[0] : ''),
      base_salary: sal.base_salary ? String(sal.base_salary) : '',
      sss_no: sal.sss_no || '',
      philhealth_no: sal.philhealth_no || '',
      pagibig_no: sal.pagibig_no || '',
      tin_no: sal.tin_no || '',
      emergency_name: emg.name || '',
      emergency_relation: emg.relationship || '',
      emergency_phone: emg.phone || '',
      address: employee.address || '',
      city: employee.city || '',
    })
    setEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    try {
      const salaryInfo = {
        ...(employee.salary_info as any || {}),
        base_salary: editForm.base_salary ? parseFloat(editForm.base_salary) : 0,
        rate_type: 'monthly',
        sss_no: editForm.sss_no || undefined,
        philhealth_no: editForm.philhealth_no || undefined,
        pagibig_no: editForm.pagibig_no || undefined,
        tin_no: editForm.tin_no || undefined,
      }

      const emergencyContact = {
        ...(employee.emergency_contact as any || {}),
        name: editForm.emergency_name || undefined,
        relationship: editForm.emergency_relation || undefined,
        phone: editForm.emergency_phone || undefined,
      }

      await updateEmployee({
        id: employee.id,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
        gender: editForm.gender || 'unspecified',
        position: editForm.position || null,
        department_id: editForm.department_id || null,
        role: editForm.role,
        employment_type: editForm.employment_type,
        hire_date: editForm.hire_date || null,
        address: editForm.address || null,
        city: editForm.city || null,
        salary_info: salaryInfo,
        emergency_contact: emergencyContact,
      })

      toast.success('201 Record updated successfully!')
      setEditOpen(false)
      refetch()
    } catch (err: any) {
      toast.error('Failed to update 201 profile', { description: err.message })
    }
  }

  const upd = (k: keyof typeof editForm, v: string) => setEditForm(p => ({ ...p, [k]: v }))

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard!`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Employee record not found</p>
        <Link to="/app/employees"><Button variant="link">Back to employees list</Button></Link>
      </div>
    )
  }

  const sal = (employee.salary_info as any) || {}
  const emg = (employee.emergency_contact as any) || {}

  const recentAtt = attendance?.slice(0, 10) ?? []
  const presentDays = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0
  const totalTracked = attendance?.length ?? 0
  const attRate = totalTracked > 0 ? Math.round((presentDays / totalTracked) * 100) : 0
  const recordsWithHours = attendance?.filter(a => a.total_hours) ?? []
  const avgHours = recordsWithHours.length > 0
    ? (recordsWithHours.reduce((s, a) => s + (a.total_hours ?? 0), 0) / recordsWithHours.length).toFixed(1)
    : '0'

  const typeConfig = EMPLOYMENT_TYPE_CONFIG[employee.employment_type] || EMPLOYMENT_TYPE_CONFIG.full_time
  const statusCfg = STATUS_CONFIG[employee.status] || STATUS_CONFIG.active

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/app/employees">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <ArrowLeft className="size-4" />
            Back to Employee Directory
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIdCardOpen(true)}>
            <IdCard className="size-4" />
            Print ID Card
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openEdit}>
            <Edit className="size-4" />
            Edit 201 File
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile Card & Biometrics Snapshot */}
        <div className="space-y-4">
          <Card className="border-border/70 shadow-xs overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary/80 to-primary" />
            <CardContent className="p-6 pt-0 relative">
              <div className="flex flex-col items-center text-center -mt-10">
                <div className="relative group">
                  <Avatar className="size-20 rounded-2xl ring-4 ring-background shadow-xl">
                    {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.first_name} className="object-cover" />}
                    <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                      {`${employee.first_name[0]}${employee.last_name[0] ?? ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="size-5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>

                <h2 className="mt-3 text-lg font-bold">{employee.first_name} {employee.last_name}</h2>
                <p className="text-sm text-muted-foreground font-medium">{employee.position ?? 'Logistics Staff'}</p>
                <p className="text-xs text-primary font-semibold">{employee.departments?.name || 'Operations'}</p>
                
                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                  <Badge variant="outline" className={`text-xs font-semibold ${typeConfig.className}`}>
                    {typeConfig.label}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" /> Email
                  </span>
                  <a href={`mailto:${employee.email}`} className="font-medium text-foreground hover:text-primary truncate max-w-[160px]">
                    {employee.email}
                  </a>
                </div>
                {employee.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5" /> Phone
                    </span>
                    <a href={`tel:${employee.phone}`} className="font-medium text-foreground hover:text-primary">
                      {employee.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="size-3.5" /> Gender
                  </span>
                  <Badge variant="outline" className="text-[11px] font-medium capitalize">
                    {employee.gender === 'female' ? '♀ Female' : employee.gender === 'male' ? '♂ Male' : employee.gender === 'other' ? 'Other' : 'Unspecified'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Date Hired
                  </span>
                  <span className="font-medium text-foreground">
                    {employee.hire_date ? format(new Date(employee.hire_date), 'MMM d, yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> Biometrics
                  </span>
                  {employee.face_encoding ? (
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="size-3" /> Enrolled
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-500 flex items-center gap-1">
                      <ShieldAlert className="size-3" /> Missing
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance KPI Widget */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Attendance (Last 14 days)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {[
                { label: 'Attendance Rate', value: `${attRate}%`, color: 'text-primary' },
                { label: 'Days Present', value: presentDays, color: 'text-emerald-600' },
                { label: 'Avg Shift Hours', value: `${avgHours}h`, color: 'text-muted-foreground' },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-muted/40">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 201 Tabs & Operational Sections */}
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="gap-1 text-xs">
                <FileText className="size-3.5" /> 201 Masterfile
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1 text-xs">
                <Clock className="size-3.5" /> Attendance Logs
              </TabsTrigger>
              <TabsTrigger value="face" className="gap-1 text-xs">
                <ShieldCheck className="size-3.5" /> Biometrics & Security
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 201 MASTERFILE & STATUTORY */}
            <TabsContent value="overview" className="space-y-4 pt-3">
              {/* Statutory & Compensation Cards */}
              <Card className="border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <DollarSign className="size-4 text-emerald-600" /> Philippine Statutory & Salary Record
                      </CardTitle>
                      <CardDescription className="text-xs">DOLE compliant tax and social security identifiers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Basic Monthly Salary</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">
                      {sal.base_salary ? `₱${parseFloat(sal.base_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '₱0.00'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30 relative group">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">SSS Number</p>
                    <p className="text-xs font-mono font-bold mt-0.5 text-foreground">{sal.sss_no || 'Unassigned'}</p>
                    {sal.sss_no && (
                      <button
                        onClick={() => copyToClipboard(sal.sss_no, 'SSS Number')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Copy SSS"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30 relative group">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">PhilHealth PIN</p>
                    <p className="text-xs font-mono font-bold mt-0.5 text-foreground">{sal.philhealth_no || 'Unassigned'}</p>
                    {sal.philhealth_no && (
                      <button
                        onClick={() => copyToClipboard(sal.philhealth_no, 'PhilHealth PIN')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Copy PhilHealth"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30 relative group">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Pag-IBIG / HDMF MID</p>
                    <p className="text-xs font-mono font-bold mt-0.5 text-foreground">{sal.pagibig_no || 'Unassigned'}</p>
                    {sal.pagibig_no && (
                      <button
                        onClick={() => copyToClipboard(sal.pagibig_no, 'Pag-IBIG MID')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Copy Pag-IBIG"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30 relative group">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">TIN (Tax ID)</p>
                    <p className="text-xs font-mono font-bold mt-0.5 text-foreground">{sal.tin_no || 'Unassigned'}</p>
                    {sal.tin_no && (
                      <button
                        onClick={() => copyToClipboard(sal.tin_no, 'TIN')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Copy TIN"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Employee System ID</p>
                    <p className="text-xs font-mono font-bold mt-0.5 text-primary">
                      {employee.employee_id || employee.id.split('-')[0].toUpperCase()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact & 201 Residence Details */}
              <Card className="border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <HeartHandshake className="size-4 text-rose-500" /> Emergency Contacts & Residential Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact Person</p>
                    <p className="text-sm font-semibold text-foreground">{emg.name || 'Not provided'}</p>
                    <p className="text-muted-foreground">{emg.relationship ? `Relationship: ${emg.relationship}` : ''}</p>
                    {emg.phone && (
                      <p className="font-mono text-primary font-bold">{emg.phone}</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Permanent Residential Address</p>
                    <p className="text-sm font-semibold text-foreground">{employee.address || 'Address on file not updated'}</p>
                    <p className="text-muted-foreground">{employee.city || ''}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: RECENT ATTENDANCE LOGS */}
            <TabsContent value="attendance" className="space-y-4 pt-3">
              <Card className="border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">Biometric Timecard History</CardTitle>
                  <CardDescription className="text-xs">Clock-in and clock-out logs recorded for this employee</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentAtt.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No attendance records logged yet</p>
                  ) : (
                    <div className="space-y-2">
                      {recentAtt.map((record) => (
                        <div key={record.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-xs">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${ATT_STATUS_CONFIG[record.status] ?? ''}`}>
                              {record.status}
                            </span>
                            <span className="font-semibold">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            {record.clock_in && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3 text-emerald-600" />
                                {format(new Date(record.clock_in), 'h:mm a')}
                              </span>
                            )}
                            {record.clock_out && (
                              <span>→ {format(new Date(record.clock_out), 'h:mm a')}</span>
                            )}
                            {record.total_hours && (
                              <span className="font-bold text-foreground">{record.total_hours}h</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: FACIAL ID & SECURITY CREDENTIALS */}
            <TabsContent value="face" className="space-y-4 pt-3">
              <Card className="border-border/70 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" /> Desk-side Facial Recognition Enrollment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enroll or re-calibrate the employee's 128-dimensional facial embedding vector for kiosk & mobile clock-ins.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md mx-auto py-2">
                    <FaceRegistration
                      targetEmployee={employee}
                      onSuccess={() => {
                        toast.success('Biometric profile refreshed!')
                        refetch()
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit 201 Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee 201 File</DialogTitle>
            <DialogDescription>
              Update employee contract, statutory numbers, and emergency contact information.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="gap-1 text-xs">
                  <Briefcase className="size-3.5" /> Basic & Job
                </TabsTrigger>
                <TabsTrigger value="statutory" className="gap-1 text-xs">
                  <DollarSign className="size-3.5" /> Statutory & Salary
                </TabsTrigger>
                <TabsTrigger value="emergency" className="gap-1 text-xs">
                  <HeartHandshake className="size-3.5" /> 201 & Emergency
                </TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">First Name *</Label>
                    <Input value={editForm.first_name} onChange={e => upd('first_name', e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last Name *</Label>
                    <Input value={editForm.last_name} onChange={e => upd('last_name', e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input value={editForm.email} disabled title="Email cannot be changed after creation" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={editForm.phone} onChange={e => upd('phone', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Job Position</Label>
                    <Input value={editForm.position} onChange={e => upd('position', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Department</Label>
                    <Select value={editForm.department_id} onValueChange={v => upd('department_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select dept." /></SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Gender / Biological Sex</Label>
                    <Select value={editForm.gender || 'unspecified'} onValueChange={v => upd('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female (♀)</SelectItem>
                        <SelectItem value="male">Male (♂)</SelectItem>
                        <SelectItem value="other">Other / Non-Binary</SelectItem>
                        <SelectItem value="unspecified">Prefer not to say / Unspecified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hire Date</Label>
                    <Input type="date" value={editForm.hire_date} onChange={e => upd('hire_date', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={editForm.role} onValueChange={v => upd('role', v as EmployeeRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Employment Type</Label>
                    <Select value={editForm.employment_type} onValueChange={v => upd('employment_type', v as EmploymentType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time (Regular)</SelectItem>
                        <SelectItem value="probationary">Probationary (6 mos)</SelectItem>
                        <SelectItem value="contract">Contractual</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="intern">Intern / OJT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Statutory Tab */}
              <TabsContent value="statutory" className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Basic Monthly Rate (PHP ₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.base_salary}
                    onChange={e => upd('base_salary', e.target.value)}
                    placeholder="e.g. 25000.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">SSS Number</Label>
                    <Input value={editForm.sss_no} onChange={e => upd('sss_no', e.target.value)} placeholder="XX-XXXXXXX-X" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">PhilHealth PIN</Label>
                    <Input value={editForm.philhealth_no} onChange={e => upd('philhealth_no', e.target.value)} placeholder="XX-XXXXXXXXX-X" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pag-IBIG / HDMF MID</Label>
                    <Input value={editForm.pagibig_no} onChange={e => upd('pagibig_no', e.target.value)} placeholder="XXXX-XXXX-XXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">TIN (Tax ID Number)</Label>
                    <Input value={editForm.tin_no} onChange={e => upd('tin_no', e.target.value)} placeholder="XXX-XXX-XXX-XXX" />
                  </div>
                </div>
              </TabsContent>

              {/* Emergency Tab */}
              <TabsContent value="emergency" className="space-y-3 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Residential Address</Label>
                  <Input value={editForm.address} onChange={e => upd('address', e.target.value)} placeholder="Unit #, Street, Barangay" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City / Municipality</Label>
                  <Input value={editForm.city} onChange={e => upd('city', e.target.value)} placeholder="Pasay City, Metro Manila" />
                </div>

                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-semibold mb-2 text-foreground">Emergency Contact Person</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Name</Label>
                      <Input value={editForm.emergency_name} onChange={e => upd('emergency_name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Input value={editForm.emergency_relation} onChange={e => upd('emergency_relation', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input value={editForm.emergency_phone} onChange={e => upd('emergency_phone', e.target.value)} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ID Card Generator Dialog */}
      <Dialog open={idCardOpen} onOpenChange={setIdCardOpen}>
        <DialogContent className="max-w-md bg-transparent border-none shadow-none text-black sm:rounded-xl">
          <div className="flex flex-col items-center">
            {/* The Badge Container (CR80 Portrait Standard) */}
            <div className="print-area w-[2.125in] h-[3.375in] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col mx-auto shrink-0 transform scale-[1.5] sm:scale-[1.8] transform-origin-top">
              {/* Header / Brand Banner */}
              <div className="bg-primary h-16 w-full flex items-center justify-center pt-2">
                <h2 className="text-white font-black text-xs tracking-widest uppercase">PRIORITY HANDLING LOGISTICS</h2>
              </div>
              
              {/* Photo Avatar */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2">
                <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-white flex items-center justify-center overflow-hidden shadow-sm">
                  {employee.avatar_url ? (
                    <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-bold text-2xl">
                      {`${employee.first_name[0]}${employee.last_name?.[0] ?? ''}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="pt-14 px-4 text-center flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-wide leading-tight mt-1">
                  {employee.first_name} {employee.last_name}
                </h3>
                <p className="text-[10px] text-primary font-semibold mt-1 leading-tight">
                  {employee.position || 'Employee'}
                </p>
                <p className="text-[8px] text-gray-500 font-medium uppercase mt-0.5">
                  {employee.departments?.name || 'Logistics Operations'}
                </p>

                <div className="mt-auto pb-4 flex flex-col items-center">
                  <div className="w-full flex justify-center gap-0.5 mb-1.5 opacity-60">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className={`bg-gray-800 h-6 ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-px'}`} />
                    ))}
                  </div>
                  <p className="text-[7px] text-gray-400 font-mono tracking-widest">
                    ID: {employee.employee_id || employee.id.split('-')[0].toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Bottom Color Bar */}
              <div className="h-1.5 w-full bg-primary absolute bottom-0" />
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-2 mt-20 sm:mt-24 no-print w-full bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
              <Button variant="outline" onClick={() => setIdCardOpen(false)}>Close</Button>
              <Button className="gap-2" onClick={() => window.print()}>
                <Printer className="size-4" /> Print Badge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
