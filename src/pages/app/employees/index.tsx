import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, UserPlus, MoreHorizontal, Mail, Phone,
  Building2, Users, UserCheck, UserX, Clock, Printer, QrCode,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useEmployees, useUpdateEmployee } from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-misc'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Employee } from '@/types'
import { supabase } from '@/lib/supabase'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  on_leave: { label: 'On Leave', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr_manager: 'HR Manager',
  team_supervisor: 'Supervisor',
  employee: 'Employee',
}

function IDCardDialog({ emp, open, onOpenChange }: { emp: Employee | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!emp) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-transparent border-none shadow-none text-black sm:rounded-xl">
        <div className="flex flex-col items-center">
          {/* Printable CR80 Standard ID Card Layout (Portrait) */}
          <div className="print-area w-[2.125in] h-[3.375in] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col mx-auto shrink-0 transform scale-[1.5] sm:scale-[1.8] transform-origin-top">
            {/* Header / Brand Banner */}
            <div className="bg-violet-600 h-16 w-full flex items-center justify-center pt-2">
              <h2 className="text-white font-black text-sm tracking-widest uppercase">Workforce Pro</h2>
            </div>
            
            {/* Photo Avatar */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-white flex items-center justify-center overflow-hidden shadow-sm">
                <span className="text-gray-400 font-bold text-2xl">
                  {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="pt-14 px-4 text-center flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-wide leading-tight mt-1">
                {emp.first_name} {emp.last_name}
              </h3>
              <p className="text-[10px] text-violet-600 font-semibold mt-1 leading-tight">
                {emp.position || 'Employee'}
              </p>
              <p className="text-[8px] text-gray-500 font-medium uppercase mt-0.5">
                {emp.departments?.name || 'No Dept'}
              </p>

              <div className="mt-auto pb-4 flex flex-col items-center">
                {/* Fake Barcode Line */}
                <div className="w-full flex justify-center gap-0.5 mb-1.5 opacity-60">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className={`bg-gray-800 h-6 ${Math.random() > 0.5 ? 'w-0.5' : Math.random() > 0.8 ? 'w-1' : 'w-px'}`} />
                  ))}
                </div>
                <p className="text-[7px] text-gray-400 font-mono tracking-widest">
                  ID: {emp.id.split('-')[0].toUpperCase()}
                </p>
              </div>
            </div>

            {/* Bottom Color Bar */}
            <div className="h-1.5 w-full bg-violet-600 absolute bottom-0" />
          </div>

          {/* Action buttons (hidden when printing) */}
          <div className="flex justify-center gap-2 mt-20 sm:mt-24 no-print w-full bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={handlePrint}>
              <Printer className="size-4" /> Print Badge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type EmpFormState = {
  first_name: string
  last_name: string
  email: string
  phone: string
  position: string
  department_id: string
  role: string
  employment_type: string
  password: string
}

const EMPTY_FORM: EmpFormState = {
  first_name: '', last_name: '', email: '', phone: '',
  position: '', department_id: '', role: 'employee', employment_type: 'full_time',
  password: '',
}

function EmployeeFormFields({
  form,
  update,
  departments,
  showPassword = false,
}: {
  form: EmpFormState
  update: (k: string, v: string) => void
  departments: { id: string; name: string }[] | undefined
  showPassword?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Sarah" required />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name</Label>
          <Input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Chen" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="sarah@company.com" required disabled={!showPassword} title={!showPassword ? "Email cannot be changed after creation" : ""} />
      </div>
      {showPassword && (
        <div className="space-y-1.5">
          <Label>Password *</Label>
          <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 6 characters" required minLength={6} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1-555-0100" />
        </div>
        <div className="space-y-1.5">
          <Label>Position</Label>
          <Input value={form.position} onChange={e => update('position', e.target.value)} placeholder="Software Engineer" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={form.department_id} onValueChange={v => update('department_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select dept." />
            </SelectTrigger>
            <SelectContent>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={v => update('role', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Employment Type</Label>
        <Select value={form.employment_type} onValueChange={v => update('employment_type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function OrgNode({ employee, allEmployees }: { employee: Employee; allEmployees: Employee[] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const directReports = allEmployees.filter(e => e.manager_id === employee.id && e.status !== 'terminated')
  const hasReports = directReports.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <motion.div 
        layout
        className="relative z-10 w-[220px] rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/20 dark:border-slate-700/50 p-5 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:shadow-[0_8px_30px_rgb(124,58,237,0.15)] group"
      >
        {/* Status indicator */}
        <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-4 ring-background ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

        <Avatar className="mx-auto mb-3 size-16 shadow-md ring-2 ring-background">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white font-bold text-lg">
            {`${employee.first_name[0]}${employee.last_name?.[0] ?? ''}`}
          </AvatarFallback>
        </Avatar>
        
        <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate px-1">{employee.first_name} {employee.last_name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate px-1 mt-0.5">{employee.position || 'Employee'}</p>
        
        <div className="mt-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 rounded-full px-3 py-1 inline-block truncate max-w-[160px] border border-violet-200 dark:border-violet-800/50">
            {employee.departments?.name || 'No Dept'}
          </span>
        </div>

        {hasReports && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:border-violet-700 transition-colors shadow-sm z-20"
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasReports && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20, overflow: 'hidden' }}
            className="relative pt-8 flex justify-center"
          >
            {/* Vertical line dropping from parent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300 dark:bg-slate-700"></div>
            
            <div className="flex justify-center">
              {directReports.map((child, i) => {
                const isFirst = i === 0
                const isLast = i === directReports.length - 1
                const isOnly = directReports.length === 1

                return (
                  <div key={child.id} className="relative pt-8 px-4 flex flex-col items-center">
                    {/* Vertical line dropping to child */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300 dark:bg-slate-700"></div>
                    
                    {/* Horizontal connecting line logic */}
                    {!isOnly && (
                      <div 
                        className={`absolute top-0 h-px bg-slate-300 dark:bg-slate-700 ${
                          isFirst ? 'left-1/2 right-0' : 
                          isLast ? 'left-0 right-1/2' : 
                          'left-0 right-0'
                        }`}
                      />
                    )}

                    <OrgNode employee={child} allEmployees={allEmployees} />
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OrgChart({ employees }: { employees: Employee[] }) {
  const empMap = new Set(employees.map(e => e.id))
  const roots = employees.filter(e => !e.manager_id || !empMap.has(e.manager_id))

  return (
    <div className="w-full overflow-x-auto pb-8 pt-4 custom-scrollbar">
      <div className="min-w-max flex justify-center gap-12">
        {roots.map(root => (
          <OrgNode key={root.id} employee={root} allEmployees={employees} />
        ))}
      </div>
    </div>
  )
}

export default function EmployeesPage() {
  const { data: employees, isLoading, refetch } = useEmployees()
  const { data: departments } = useDepartments()
  const { mutateAsync: updateEmployee, isPending: isUpdating } = useUpdateEmployee()
  const { can } = usePermissions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('grid')

  const [addOpen, setAddOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [deactivateEmp, setDeactivateEmp] = useState<Employee | null>(null)
  const [idCardEmp, setIdCardEmp] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmpFormState>(EMPTY_FORM)

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name ?? '',
      email: emp.email,
      phone: emp.phone ?? '',
      position: emp.position ?? '',
      department_id: emp.department_id ?? '',
      role: emp.role,
      employment_type: emp.employment_type ?? 'full_time',
      password: '',
    })
    setEditEmp(emp)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setIsCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }
      const { data: result, error: invokeError } = await supabase.functions.invoke('create-employee', {
        body: {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
          position: form.position || null,
          department_id: form.department_id || null,
          role: form.role,
          employment_type: form.employment_type,
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to create employee')
      }
      if (result?.error) {
        throw new Error(result.error)
      }
      toast.success('Employee account created successfully')
      setAddOpen(false)
      setForm(EMPTY_FORM)
      refetch()
    } catch (err: any) {
      toast.error('Failed to create employee', { description: err.message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editEmp) return
    try {
      const { password, department_id, ...updatesToApply } = form
      await updateEmployee({
        id: editEmp.id,
        ...updatesToApply,
        department_id: department_id || null,
        role: form.role as import('@/types').EmployeeRole,
        employment_type: form.employment_type as import('@/types').EmploymentType,
      })
      toast.success('Employee updated successfully')
      setEditEmp(null)
    } catch (err: any) {
      toast.error('Failed to update employee', { description: err.message })
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateEmp) return
    try {
      await updateEmployee({ id: deactivateEmp.id, status: 'inactive' as const })
      toast.success(`${deactivateEmp.first_name} has been deactivated`)
      setDeactivateEmp(null)
    } catch (err: any) {
      toast.error('Failed to deactivate employee', { description: err.message })
    }
  }

  const handleReactivate = async (emp: Employee) => {
    try {
      await updateEmployee({ id: emp.id, status: 'active' as const })
      toast.success(`${emp.first_name} has been reactivated`)
    } catch (err: any) {
      toast.error('Failed to reactivate employee', { description: err.message })
    }
  }

  const filtered = useMemo(() => {
    return (employees ?? []).filter(e => {
      const matchSearch = search === '' ||
        `${e.first_name} ${e.last_name} ${e.email} ${e.position}`.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || e.status === statusFilter
      const matchDept = deptFilter === 'all' || e.department_id === deptFilter
      return matchSearch && matchStatus && matchDept
    })
  }, [employees, search, statusFilter, deptFilter])

  const summary = useMemo(() => ({
    total: employees?.length ?? 0,
    active: employees?.filter(e => e.status === 'active').length ?? 0,
    onLeave: employees?.filter(e => e.status === 'on_leave').length ?? 0,
    inactive: employees?.filter(e => e.status === 'inactive' || e.status === 'terminated').length ?? 0,
  }), [employees])

  return (
    <div className="space-y-6">
      <IDCardDialog emp={idCardEmp} open={!!idCardEmp} onOpenChange={(op) => !op && setIdCardEmp(null)} />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage and view all {summary.total} employees in your organization
          </p>
        </div>
        {can.manageEmployees() && (
          <Button className="gap-1.5" onClick={openAdd}>
            <UserPlus className="size-4" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total', value: summary.total, icon: Users, color: 'text-primary' },
          { label: 'Active', value: summary.active, icon: UserCheck, color: 'text-emerald-600' },
          { label: 'On Leave', value: summary.onLeave, icon: Clock, color: 'text-amber-600' },
          { label: 'Inactive', value: summary.inactive, icon: UserX, color: 'text-muted-foreground' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className={`size-5 ${s.color}`} />
              <div>
                <p className="text-xl font-bold">{isLoading ? '...' : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <Filter className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44">
            <Building2 className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} employees</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="org">Organization Chart</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="grid" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {/* Employee Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Users className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No employees found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-12 rounded-xl">
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-sm font-semibold text-primary">
                          {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link to={`/app/employees/${emp.id}`} className="line-clamp-1 text-sm font-semibold hover:text-primary">
                          {emp.first_name} {emp.last_name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{emp.position ?? 'No position'}</p>
                        <p className="truncate text-xs text-muted-foreground/70">{emp.departments?.name ?? 'No department'}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 opacity-0 transition-opacity group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/app/employees/${emp.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIdCardEmp(emp)}>
                          <QrCode className="mr-2 size-3.5" />
                          Generate ID Card
                        </DropdownMenuItem>
                        {can.manageEmployees() && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(emp)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {emp.status === 'inactive' ? (
                              <DropdownMenuItem onClick={() => handleReactivate(emp)}>
                                Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeactivateEmp(emp)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[emp.status]?.className ?? ''}`}>
                      {STATUS_CONFIG[emp.status]?.label ?? emp.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{emp.employee_id}</span>
                  </div>

                  <div className="mt-3 flex gap-3 border-t border-border pt-3">
                    <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                      <Mail className="size-3" />
                      <span className="truncate max-w-[80px]">{emp.email.split('@')[0]}</span>
                    </a>
                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                        <Phone className="size-3" />
                        <span className="truncate">Call</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
        </TabsContent>
        
        <TabsContent value="org" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Users className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No employees found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 bg-muted/20 overflow-hidden">
                <OrgChart employees={filtered} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Fill out the details below to add a new employee to the organization.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            This will create a login account for the employee.
          </p>
          <form onSubmit={handleAdd} className="mt-2 space-y-4">
            <EmployeeFormFields form={form} update={update} departments={departments} showPassword />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmp} onOpenChange={open => { if (!open) setEditEmp(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="mt-2 space-y-4">
            <EmployeeFormFields form={form} update={update} departments={departments} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditEmp(null)}>Cancel</Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateEmp} onOpenChange={open => { if (!open) setDeactivateEmp(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivateEmp?.first_name} {deactivateEmp?.last_name}?
              They will lose access to the system but their data will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
