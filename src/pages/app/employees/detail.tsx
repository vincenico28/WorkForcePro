import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Calendar, Briefcase, Clock, Edit, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { useEmployee, useUpdateEmployee } from '@/hooks/use-employees'
import { useEmployeeAttendance } from '@/hooks/use-attendance'
import { useDepartments } from '@/hooks/use-misc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FaceRegistration } from '@/components/face-recognition/FaceRegistration'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  on_leave: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  inactive: 'bg-gray-100 text-gray-600',
  terminated: 'bg-red-100 text-red-700',
}

const ATT_STATUS_CONFIG: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  holiday: 'bg-blue-100 text-blue-700',
  half_day: 'bg-purple-100 text-purple-700',
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: employee, isLoading } = useEmployee(id!)
  const { data: attendance } = useEmployeeAttendance(id!, 14)
  const { data: departments } = useDepartments()
  const { mutateAsync: updateEmployee, isPending: isSaving } = useUpdateEmployee()

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    position: '', department_id: '', role: 'employee', employment_type: 'full_time',
  })

  const openEdit = () => {
    if (!employee) return
    setEditForm({
      first_name: employee.first_name,
      last_name: employee.last_name ?? '',
      email: employee.email,
      phone: employee.phone ?? '',
      position: employee.position ?? '',
      department_id: employee.department_id ?? '',
      role: employee.role,
      employment_type: employee.employment_type ?? 'full_time',
    })
    setEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    try {
      const { department_id, ...updatesToApply } = editForm
      await updateEmployee({
        id: employee.id,
        ...updatesToApply,
        department_id: department_id || null,
        role: editForm.role as import('@/types').EmployeeRole,
        employment_type: editForm.employment_type as import('@/types').EmploymentType,
      })
      toast.success('Profile updated')
      setEditOpen(false)
    } catch (err: any) {
      toast.error('Failed to update profile', { description: err.message })
    }
  }

  const upd = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }))

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
        <p className="text-muted-foreground">Employee not found</p>
        <Link to="/app/employees"><Button variant="link">Back to employees</Button></Link>
      </div>
    )
  }

  const recentAtt = attendance?.slice(0, 10) ?? []
  const presentDays = attendance?.filter(a => a.status === 'present' || a.status === 'late').length ?? 0
  const totalTracked = attendance?.length ?? 0
  const attRate = totalTracked > 0 ? Math.round((presentDays / totalTracked) * 100) : 0
  const recordsWithHours = attendance?.filter(a => a.total_hours) ?? []
  const avgHours = recordsWithHours.length > 0
    ? (recordsWithHours.reduce((s, a) => s + (a.total_hours ?? 0), 0) / recordsWithHours.length).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/app/employees">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <ArrowLeft className="size-4" />
            Employees
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="size-20 rounded-2xl">
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-xl font-bold text-primary">
                    {`${employee.first_name[0]}${employee.last_name[0] ?? ''}`}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-3 text-lg font-bold">{employee.first_name} {employee.last_name}</h2>
                <p className="text-sm text-muted-foreground">{employee.position ?? 'No position'}</p>
                <p className="text-xs text-muted-foreground/70">{employee.departments?.name}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[employee.status]}`}>
                    {employee.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">{employee.employee_id}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${employee.email}`} className="truncate text-primary hover:underline">{employee.email}</a>
                </div>
                {employee.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="size-4 shrink-0 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.departments?.name && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    <span>{employee.departments.name}</span>
                  </div>
                )}
                {employee.hire_date && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                    <span>Joined {format(new Date(employee.hire_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Briefcase className="size-4 shrink-0 text-muted-foreground" />
                  <span className="capitalize">{employee.employment_type.replace('_', ' ')}</span>
                </div>
              </div>

              <Button variant="outline" className="mt-4 w-full gap-2" onClick={openEdit}>
                <Edit className="size-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Attendance summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Attendance (Last 14 days)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {[
                { label: 'Rate', value: `${attRate}%`, color: 'text-primary' },
                { label: 'Present', value: presentDays, color: 'text-emerald-600' },
                { label: 'Avg Hrs', value: avgHours, color: 'text-muted-foreground' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="space-y-4 lg:col-span-2">
          {/* Role & Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {[
                { label: 'Role', value: employee.role.replace('_', ' ') },
                { label: 'Employee ID', value: employee.employee_id ?? '-' },
                { label: 'Employment Type', value: employee.employment_type.replace('_', ' ') },
                { label: 'Status', value: employee.status.replace('_', ' ') },
                { label: 'Hire Date', value: employee.hire_date ? format(new Date(employee.hire_date), 'MMM d, yyyy') : '-' },
                { label: 'Department', value: employee.departments?.name ?? '-' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium capitalize">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Attendance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAtt.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No attendance records found</p>
              ) : (
                <div className="space-y-2">
                  {recentAtt.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ATT_STATUS_CONFIG[record.status] ?? ''}`}>
                          {record.status}
                        </span>
                        <span className="font-medium">{format(new Date(record.date), 'EEE, MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {record.clock_in && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(new Date(record.clock_in), 'h:mm a')}
                          </span>
                        )}
                        {record.clock_out && (
                          <span>— {format(new Date(record.clock_out), 'h:mm a')}</span>
                        )}
                        {record.total_hours && (
                          <span className="font-medium text-foreground">{record.total_hours}h</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription className="sr-only">
              Edit the employee's profile details and Face ID.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="face">Face ID</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <form onSubmit={handleSave} className="mt-2 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input value={editForm.first_name} onChange={e => upd('first_name', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input value={editForm.last_name} onChange={e => upd('last_name', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={editForm.email} onChange={e => upd('email', e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={e => upd('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Position</Label>
                    <Input value={editForm.position} onChange={e => upd('position', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select value={editForm.department_id} onValueChange={v => upd('department_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select dept." /></SelectTrigger>
                      <SelectContent>
                        {departments?.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={editForm.role} onValueChange={v => upd('role', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr_manager">HR Manager</SelectItem>
                        <SelectItem value="team_supervisor">Supervisor</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Employment Type</Label>
                  <Select value={editForm.employment_type} onValueChange={v => upd('employment_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="face">
              <div className="pt-4">
                <FaceRegistration targetEmployee={employee} />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
