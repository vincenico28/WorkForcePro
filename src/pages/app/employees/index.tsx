import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, UserPlus, MoreHorizontal, Mail, Phone,
  Building2, Users, UserCheck, UserX, Clock, Printer, QrCode,
  ChevronDown, ChevronUp, Download, Upload, ShieldAlert,
  ShieldCheck, LayoutGrid, Table as TableIcon, Network,
  CheckCircle2, AlertTriangle, FileSpreadsheet, Sparkles,
  Briefcase, DollarSign, HeartHandshake, UserCog, RefreshCw
} from 'lucide-react'
import { useEmployees, useUpdateEmployee } from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-misc'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FaceRegistration } from '@/components/face-recognition/FaceRegistration'
import { toast } from 'sonner'
import type { Employee, EmploymentType, EmployeeRole, EmployeeStatus } from '@/types'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/utils/export'

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: UserCheck },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: UserX },
  on_leave: { label: 'On Leave', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Clock },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: AlertTriangle },
}

const EMPLOYMENT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  full_time: { label: 'Full Time', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' },
  probationary: { label: 'Probationary', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' },
  contract: { label: 'Contractual', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800' },
  part_time: { label: 'Part Time', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800' },
  intern: { label: 'Intern', className: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800' },
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
          {/* Printable CR80 Standard ID Card Layout */}
          <div className="print-area w-[2.125in] h-[3.375in] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col mx-auto shrink-0 transform scale-[1.5] sm:scale-[1.8] transform-origin-top">
            {/* Header / Brand Banner */}
            <div className="bg-primary h-16 w-full flex items-center justify-center pt-2">
              <h2 className="text-white font-black text-sm tracking-widest uppercase">PRIORITY HANDLING LOGISTICS</h2>
            </div>
            
            {/* Photo Avatar */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-white flex items-center justify-center overflow-hidden shadow-sm">
                {emp.avatar_url ? (
                  <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-bold text-2xl">
                    {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="pt-14 px-4 text-center flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-wide leading-tight mt-1">
                {emp.first_name} {emp.last_name}
              </h3>
              <p className="text-[10px] text-primary font-semibold mt-1 leading-tight">
                {emp.position || 'Employee'}
              </p>
              <p className="text-[8px] text-gray-500 font-medium uppercase mt-0.5">
                {emp.departments?.name || 'Logistics Operations'}
              </p>

              <div className="mt-auto pb-4 flex flex-col items-center">
                {/* Simulated Barcode */}
                <div className="w-full flex justify-center gap-0.5 mb-1.5 opacity-60">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className={`bg-gray-800 h-6 ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-px'}`} />
                  ))}
                </div>
                <p className="text-[7px] text-gray-400 font-mono tracking-widest">
                  ID: {emp.employee_id || emp.id.split('-')[0].toUpperCase()}
                </p>
              </div>
            </div>

            {/* Bottom Color Bar */}
            <div className="h-1.5 w-full bg-primary absolute bottom-0" />
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-2 mt-20 sm:mt-24 no-print w-full bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-lg">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button className="gap-2" onClick={handlePrint}>
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
  role: EmployeeRole
  employment_type: EmploymentType
  hire_date: string
  password?: string
  // PH Statutory & Compensation
  base_salary: string
  sss_no: string
  philhealth_no: string
  pagibig_no: string
  tin_no: string
  // Emergency Contact
  emergency_name: string
  emergency_relation: string
  emergency_phone: string
  address: string
  city: string
}

const EMPTY_FORM: EmpFormState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  position: '',
  department_id: '',
  role: 'employee',
  employment_type: 'full_time',
  hire_date: new Date().toISOString().split('T')[0],
  password: '',
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
}

function EmployeeFormModal({
  open,
  onOpenChange,
  isEdit = false,
  form,
  update,
  onSubmit,
  isPending,
  departments,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEdit?: boolean
  form: EmpFormState
  update: (k: keyof EmpFormState, v: string) => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  departments: { id: string; name: string }[] | undefined
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee 201 File' : 'Onboard New Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update employment contract, statutory IDs, and emergency contacts.'
              : 'Create employee account and populate complete 201 records.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
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

            {/* TAB 1: BASIC & JOB DETAILS */}
            <TabsContent value="basic" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="e.g. Maria" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="e.g. Santos" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Work Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="maria.santos@priorityhandling.com"
                    required
                    disabled={isEdit}
                    title={isEdit ? "Email cannot be changed after creation" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0917-123-4567" />
                </div>
              </div>

              {!isEdit && (
                <div className="space-y-1">
                  <Label className="text-xs">Initial Temporary Password *</Label>
                  <Input
                    type="password"
                    value={form.password || ''}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Job Position / Designation</Label>
                  <Input value={form.position} onChange={e => update('position', e.target.value)} placeholder="e.g. Logistics Dispatcher" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Select value={form.department_id} onValueChange={v => update('department_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {departments?.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">System Role</Label>
                  <Select value={form.role} onValueChange={v => update('role', v as EmployeeRole)}>
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
                  <Select value={form.employment_type} onValueChange={v => update('employment_type', v as EmploymentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time (Regular)</SelectItem>
                      <SelectItem value="probationary">Probationary (6 mos)</SelectItem>
                      <SelectItem value="contract">Contractual / Project</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="intern">Intern / OJT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hire / Start Date</Label>
                  <Input type="date" value={form.hire_date} onChange={e => update('hire_date', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: STATUTORY & COMPENSATION */}
            <TabsContent value="statutory" className="space-y-3 pt-3">
              <div className="rounded-lg bg-muted/40 p-3 border text-xs text-muted-foreground flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary shrink-0" />
                <span>Philippine DOLE & Statutory deductions (SSS, PhilHealth, Pag-IBIG, TRAIN Law) calculate automatically from these numbers.</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Basic Monthly Rate (PHP ₱)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.base_salary}
                  onChange={e => update('base_salary', e.target.value)}
                  placeholder="e.g. 25000.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">SSS Number</Label>
                  <Input value={form.sss_no} onChange={e => update('sss_no', e.target.value)} placeholder="XX-XXXXXXX-X" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PhilHealth PIN</Label>
                  <Input value={form.philhealth_no} onChange={e => update('philhealth_no', e.target.value)} placeholder="XX-XXXXXXXXX-X" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pag-IBIG / HDMF MID</Label>
                  <Input value={form.pagibig_no} onChange={e => update('pagibig_no', e.target.value)} placeholder="XXXX-XXXX-XXXX" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">TIN (Tax ID Number)</Label>
                  <Input value={form.tin_no} onChange={e => update('tin_no', e.target.value)} placeholder="XXX-XXX-XXX-XXX" />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: EMERGENCY & 201 DETAILS */}
            <TabsContent value="emergency" className="space-y-3 pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Residential Address</Label>
                <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Unit #, Street, Barangay" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City / Municipality</Label>
                <Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="e.g. Pasay City, Metro Manila" />
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold mb-2 text-foreground">Emergency Contact Information</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Contact Person Name</Label>
                    <Input value={form.emergency_name} onChange={e => update('emergency_name', e.target.value)} placeholder="e.g. Roberto Santos" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Input value={form.emergency_relation} onChange={e => update('emergency_relation', e.target.value)} placeholder="e.g. Spouse / Parent" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Emergency Phone</Label>
                    <Input value={form.emergency_phone} onChange={e => update('emergency_phone', e.target.value)} placeholder="0918-987-6543" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Update Profile' : 'Onboard Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OrgNode({ employee, allEmployees }: { employee: Employee; allEmployees: Employee[] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const directReports = allEmployees.filter(e => e.manager_id === employee.id && e.status !== 'terminated')
  const hasReports = directReports.length > 0

  return (
    <div className="flex flex-col items-center">
      <motion.div 
        layout
        className="relative z-10 w-[220px] rounded-2xl bg-card border border-border p-4 text-center shadow-sm transition-all hover:shadow-md group"
      >
        <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ring-2 ring-background ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

        <Avatar className="mx-auto mb-2.5 size-14 shadow-sm ring-1 ring-border">
          {employee.avatar_url && <AvatarImage src={employee.avatar_url} className="object-cover" />}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
            {`${employee.first_name[0]}${employee.last_name?.[0] ?? ''}`}
          </AvatarFallback>
        </Avatar>
        
        <p className="text-sm font-bold text-foreground truncate px-1">{employee.first_name} {employee.last_name}</p>
        <p className="text-xs text-muted-foreground font-medium truncate px-1 mt-0.5">{employee.position || 'Employee'}</p>
        
        <div className="mt-2.5">
          <span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary rounded-full px-2.5 py-0.5 inline-block truncate max-w-[160px] border border-primary/20">
            {employee.departments?.name || 'Operations'}
          </span>
        </div>

        {hasReports && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shadow-xs z-20"
          >
            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {hasReports && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="relative pt-6 flex justify-center"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-border"></div>
            <div className="flex justify-center">
              {directReports.map((child, i) => {
                const isFirst = i === 0
                const isLast = i === directReports.length - 1
                const isOnly = directReports.length === 1

                return (
                  <div key={child.id} className="relative pt-6 px-3 flex flex-col items-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-border"></div>
                    {!isOnly && (
                      <div 
                        className={`absolute top-0 h-px bg-border ${
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
      <div className="min-w-max flex justify-center gap-8">
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
  const [typeFilter, setTypeFilter] = useState('all')
  const [faceFilter, setFaceFilter] = useState('all') // 'all' | 'enrolled' | 'missing'
  const [activeTab, setActiveTab] = useState<'table' | 'grid' | 'org'>('table')

  // Selected row IDs for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionPending, setBulkActionPending] = useState(false)

  // Dialog States
  const [addOpen, setAddOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [deactivateEmp, setDeactivateEmp] = useState<Employee | null>(null)
  const [idCardEmp, setIdCardEmp] = useState<Employee | null>(null)
  const [faceEnrollEmp, setFaceEnrollEmp] = useState<Employee | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState<EmpFormState>(EMPTY_FORM)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (k: keyof EmpFormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setAddOpen(true)
  }

  const openEdit = (emp: Employee) => {
    const sal = (emp.salary_info as any) || {}
    const emg = (emp.emergency_contact as any) || {}

    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name ?? '',
      email: emp.email,
      phone: emp.phone ?? '',
      position: emp.position ?? '',
      department_id: emp.department_id ?? '',
      role: emp.role,
      employment_type: emp.employment_type ?? 'full_time',
      hire_date: emp.hire_date || (emp.created_at ? emp.created_at.split('T')[0] : ''),
      password: '',
      base_salary: sal.base_salary ? String(sal.base_salary) : '',
      sss_no: sal.sss_no || '',
      philhealth_no: sal.philhealth_no || '',
      pagibig_no: sal.pagibig_no || '',
      tin_no: sal.tin_no || '',
      emergency_name: emg.name || '',
      emergency_relation: emg.relationship || '',
      emergency_phone: emg.phone || '',
      address: emp.address || '',
      city: emp.city || '',
    })
    setEditEmp(emp)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.password || form.password.length < 6) {
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

      const salaryInfo = {
        base_salary: form.base_salary ? parseFloat(form.base_salary) : 0,
        rate_type: 'monthly',
        sss_no: form.sss_no || undefined,
        philhealth_no: form.philhealth_no || undefined,
        pagibig_no: form.pagibig_no || undefined,
        tin_no: form.tin_no || undefined,
      }

      const emergencyContact = {
        name: form.emergency_name || undefined,
        relationship: form.emergency_relation || undefined,
        phone: form.emergency_phone || undefined,
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
          hire_date: form.hire_date || null,
          address: form.address || null,
          city: form.city || null,
          salary_info: salaryInfo,
          emergency_contact: emergencyContact,
        }
      })

      if (invokeError) throw new Error(invokeError.message || 'Failed to create employee')
      if (result?.error) throw new Error(result.error)

      toast.success(`Employee ${form.first_name} ${form.last_name} created successfully!`)
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
      const salaryInfo = {
        ...(editEmp.salary_info as any || {}),
        base_salary: form.base_salary ? parseFloat(form.base_salary) : 0,
        rate_type: 'monthly',
        sss_no: form.sss_no || undefined,
        philhealth_no: form.philhealth_no || undefined,
        pagibig_no: form.pagibig_no || undefined,
        tin_no: form.tin_no || undefined,
      }

      const emergencyContact = {
        ...(editEmp.emergency_contact as any || {}),
        name: form.emergency_name || undefined,
        relationship: form.emergency_relation || undefined,
        phone: form.emergency_phone || undefined,
      }

      await updateEmployee({
        id: editEmp.id,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        position: form.position || null,
        department_id: form.department_id || null,
        role: form.role,
        employment_type: form.employment_type,
        hire_date: form.hire_date || null,
        address: form.address || null,
        city: form.city || null,
        salary_info: salaryInfo,
        emergency_contact: emergencyContact,
      })

      toast.success('201 File updated successfully')
      setEditEmp(null)
    } catch (err: any) {
      toast.error('Failed to update employee', { description: err.message })
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateEmp) return
    try {
      await updateEmployee({ id: deactivateEmp.id, status: 'inactive' })
      toast.success(`${deactivateEmp.first_name} has been set to Inactive`)
      setDeactivateEmp(null)
    } catch (err: any) {
      toast.error('Failed to deactivate employee', { description: err.message })
    }
  }

  const handleReactivate = async (emp: Employee) => {
    try {
      await updateEmployee({ id: emp.id, status: 'active' })
      toast.success(`${emp.first_name} reactivated to Active roster`)
    } catch (err: any) {
      toast.error('Failed to reactivate employee', { description: err.message })
    }
  }

  // Bulk Operations
  const handleBulkStatusChange = async (newStatus: EmployeeStatus) => {
    if (!selectedIds.length) return
    setBulkActionPending(true)
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in('id', selectedIds)

      if (error) throw error
      toast.success(`Updated ${selectedIds.length} employee(s) to ${newStatus}`)
      setSelectedIds([])
      refetch()
    } catch (err: any) {
      toast.error('Bulk update failed: ' + err.message)
    } finally {
      setBulkActionPending(false)
    }
  }

  const handleBulkRegularize = async () => {
    if (!selectedIds.length) return
    setBulkActionPending(true)
    try {
      const { error } = await supabase
        .from('employees')
        .update({ employment_type: 'full_time', updated_at: new Date().toISOString() })
        .in('id', selectedIds)

      if (error) throw error
      toast.success(`Regularized ${selectedIds.length} employee(s) to Full Time!`)
      setSelectedIds([])
      refetch()
    } catch (err: any) {
      toast.error('Regularization failed: ' + err.message)
    } finally {
      setBulkActionPending(false)
    }
  }

  // Export Masterlist to CSV
  const handleExportCSV = () => {
    if (!employees || !employees.length) {
      toast.error('No employee records to export')
      return
    }

    const exportData = (selectedIds.length > 0 
      ? employees.filter(e => selectedIds.includes(e.id))
      : employees
    ).map(e => {
      const sal = (e.salary_info as any) || {}
      const emg = (e.emergency_contact as any) || {}
      return {
        'Employee ID': e.employee_id || e.id.split('-')[0].toUpperCase(),
        'First Name': e.first_name,
        'Last Name': e.last_name || '',
        'Email': e.email,
        'Phone': e.phone || '',
        'Department': e.departments?.name || 'Unassigned',
        'Position': e.position || '',
        'Role': ROLE_LABELS[e.role] || e.role,
        'Employment Type': EMPLOYMENT_TYPE_CONFIG[e.employment_type]?.label || e.employment_type,
        'Status': STATUS_CONFIG[e.status]?.label || e.status,
        'Hire Date': e.hire_date || '',
        'Face Biometrics': e.face_encoding ? 'Enrolled' : 'Missing',
        'Base Salary': sal.base_salary || '',
        'SSS Number': sal.sss_no || '',
        'PhilHealth PIN': sal.philhealth_no || '',
        'Pag-IBIG MID': sal.pagibig_no || '',
        'TIN': sal.tin_no || '',
        'Emergency Contact': emg.name || '',
        'Emergency Relationship': emg.relationship || '',
        'Emergency Phone': emg.phone || '',
        'Address': e.address || '',
        'City': e.city || '',
      }
    })

    downloadCSV(exportData, `WorkforcePro_Employees_Masterlist_${new Date().toISOString().split('T')[0]}`)
    toast.success(`Exported ${exportData.length} employee records to CSV`)
  }

  // Filtered list
  const filtered = useMemo(() => {
    return (employees ?? []).filter(e => {
      const matchSearch = search === '' ||
        `${e.first_name} ${e.last_name} ${e.email} ${e.position} ${e.employee_id}`.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || e.status === statusFilter
      const matchDept = deptFilter === 'all' || e.department_id === deptFilter
      const matchType = typeFilter === 'all' || e.employment_type === typeFilter
      const matchFace = faceFilter === 'all' 
        ? true 
        : faceFilter === 'enrolled' ? !!e.face_encoding : !e.face_encoding

      return matchSearch && matchStatus && matchDept && matchType && matchFace
    })
  }, [employees, search, statusFilter, deptFilter, typeFilter, faceFilter])

  // Summary Metrics
  const summary = useMemo(() => ({
    total: employees?.length ?? 0,
    active: employees?.filter(e => e.status === 'active').length ?? 0,
    probationary: employees?.filter(e => e.employment_type === 'probationary').length ?? 0,
    missingFaceId: employees?.filter(e => !e.face_encoding && e.status === 'active').length ?? 0,
    onLeave: employees?.filter(e => e.status === 'on_leave').length ?? 0,
    inactive: employees?.filter(e => e.status === 'inactive' || e.status === 'terminated').length ?? 0,
  }), [employees])

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(e => e.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* ID Card Printer Modal */}
      <IDCardDialog emp={idCardEmp} open={!!idCardEmp} onOpenChange={(op) => !op && setIdCardEmp(null)} />

      {/* Face Registration Modal */}
      <Dialog open={!!faceEnrollEmp} onOpenChange={(op) => !op && setFaceEnrollEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desk-side Face ID Enrollment</DialogTitle>
            <DialogDescription>
              Register biometric facial recognition for {faceEnrollEmp?.first_name} {faceEnrollEmp?.last_name}.
            </DialogDescription>
          </DialogHeader>
          {faceEnrollEmp && (
            <div className="py-2">
              <FaceRegistration
                targetEmployee={faceEnrollEmp}
                onSuccess={() => {
                  setFaceEnrollEmp(null)
                  refetch()
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 201 Form Modal (Add / Edit) */}
      <EmployeeFormModal
        open={addOpen || !!editEmp}
        onOpenChange={(op) => {
          if (!op) {
            setAddOpen(false)
            setEditEmp(null)
          }
        }}
        isEdit={!!editEmp}
        form={form}
        update={update}
        onSubmit={editEmp ? handleEdit : handleAdd}
        isPending={isCreating || isUpdating}
        departments={departments}
      />

      {/* Top Header & Master Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Directory & 201 Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage workforce contracts, statutory records, biometric enrollments, and organizational hierarchy
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={handleExportCSV}>
            <Download className="size-4" />
            {selectedIds.length > 0 ? `Export (${selectedIds.length})` : 'Export Masterlist'}
          </Button>
          {can.manageEmployees() && (
            <Button className="gap-1.5" onClick={openAdd}>
              <UserPlus className="size-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* HR Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Workforce', value: summary.total, icon: Users, color: 'text-primary', onClick: () => { setStatusFilter('all'); setFaceFilter('all'); } },
          { label: 'Active on Duty', value: summary.active, icon: UserCheck, color: 'text-emerald-600', onClick: () => { setStatusFilter('active'); setFaceFilter('all'); } },
          { label: 'Probationary Staff', value: summary.probationary, icon: Sparkles, color: 'text-amber-600', onClick: () => { setTypeFilter('probationary'); setFaceFilter('all'); } },
          { 
            label: 'Missing Face ID', 
            value: summary.missingFaceId, 
            icon: ShieldAlert, 
            color: summary.missingFaceId > 0 ? 'text-rose-600' : 'text-emerald-600',
            bg: summary.missingFaceId > 0 ? 'border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20' : '',
            onClick: () => { setFaceFilter(faceFilter === 'missing' ? 'all' : 'missing'); }
          },
        ].map((s) => (
          <Card 
            key={s.label} 
            onClick={s.onClick}
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 shadow-xs ${s.bg || ''}`}
          >
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="p-2.5 rounded-xl bg-muted/60">
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{isLoading ? '...' : s.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HR Filters & Search Bar */}
      <Card className="p-4 shadow-xs border-border/70">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, position, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Department Filter */}
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px] text-xs">
              <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] text-xs">
              <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
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

          {/* Employment Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] text-xs">
              <Briefcase className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Contract Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contract Types</SelectItem>
              <SelectItem value="full_time">Full Time (Regular)</SelectItem>
              <SelectItem value="probationary">Probationary</SelectItem>
              <SelectItem value="contract">Contractual</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>

          {/* Face ID Status Filter */}
          <Select value={faceFilter} onValueChange={setFaceFilter}>
            <SelectTrigger className="w-[140px] text-xs">
              <ShieldCheck className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Biometrics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Biometrics</SelectItem>
              <SelectItem value="enrolled">✓ Face ID Enrolled</SelectItem>
              <SelectItem value="missing">⚠️ Missing Face ID</SelectItem>
            </SelectContent>
          </Select>

          {/* Active Filter Clear */}
          {(search || statusFilter !== 'all' || deptFilter !== 'all' || typeFilter !== 'all' || faceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setDeptFilter('all')
                setTypeFilter('all')
                setFaceFilter('all')
              }}
            >
              Reset Filters
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground font-medium">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'} found
          </div>
        </div>
      </Card>

      {/* Multi-View Tabs & View Switcher */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/70">
            <TabsTrigger value="table" className="gap-1.5 text-xs">
              <TableIcon className="size-3.5" /> High-Density Table
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1.5 text-xs">
              <LayoutGrid className="size-3.5" /> Visual Cards
            </TabsTrigger>
            <TabsTrigger value="org" className="gap-1.5 text-xs">
              <Network className="size-3.5" /> Organization Hierarchy
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================= VIEW 1: HIGH DENSITY HR TABLE ================= */}
        <TabsContent value="table" className="mt-4 focus-visible:outline-none">
          <Card className="overflow-hidden border-border/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & ID</th>
                    <th className="py-3 px-4">Position & Role</th>
                    <th className="py-3 px-4">Contract Type</th>
                    <th className="py-3 px-4">Face Biometrics</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="py-4 px-4">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-muted-foreground">
                        <Users className="mx-auto size-10 text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-foreground">No employees match the criteria</p>
                        <p className="text-xs">Adjust your search keyword or clear the active filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => {
                      const isSelected = selectedIds.includes(emp.id)
                      const typeConfig = EMPLOYMENT_TYPE_CONFIG[emp.employment_type] || EMPLOYMENT_TYPE_CONFIG.full_time
                      const statusCfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.active

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectRow(emp.id)}
                              aria-label={`Select ${emp.first_name}`}
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9 ring-1 ring-border">
                                {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                  {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <Link
                                  to={`/app/employees/${emp.id}`}
                                  className="font-semibold text-foreground hover:text-primary transition-colors text-sm line-clamp-1"
                                >
                                  {emp.first_name} {emp.last_name}
                                </Link>
                                <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-xs text-foreground">{emp.departments?.name || 'Operations'}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              ID: {emp.employee_id || emp.id.split('-')[0].toUpperCase()}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-xs text-foreground">{emp.position || 'Staff'}</p>
                            <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[emp.role] || emp.role}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className={`text-[11px] font-semibold ${typeConfig.className}`}>
                              {typeConfig.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            {emp.face_encoding ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 gap-1 text-[10px] font-semibold border-emerald-300 dark:border-emerald-800">
                                <ShieldCheck className="size-3" /> Enrolled
                              </Badge>
                            ) : (
                              <button
                                onClick={() => setFaceEnrollEmp(emp)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                                title="Click to enroll Facial Biometrics desk-side"
                              >
                                <ShieldAlert className="size-3" /> Enroll Face
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/app/employees/${emp.id}`}>
                                    <Briefcase className="mr-2 size-3.5" /> View 201 File
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIdCardEmp(emp)}>
                                  <QrCode className="mr-2 size-3.5" /> Print ID Badge
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFaceEnrollEmp(emp)}>
                                  <ShieldCheck className="mr-2 size-3.5" /> Desk-side Face ID
                                </DropdownMenuItem>
                                {can.manageEmployees() && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => openEdit(emp)}>
                                      <UserCog className="mr-2 size-3.5" /> Edit Profile & IDs
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {emp.status === 'inactive' ? (
                                      <DropdownMenuItem onClick={() => handleReactivate(emp)}>
                                        <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" /> Reactivate
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeactivateEmp(emp)}
                                      >
                                        <UserX className="mr-2 size-3.5" /> Deactivate
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ================= VIEW 2: VISUAL GRID CARDS ================= */}
        <TabsContent value="grid" className="mt-4 focus-visible:outline-none">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Users className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No employees found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((emp, i) => {
                const typeConfig = EMPLOYMENT_TYPE_CONFIG[emp.employment_type] || EMPLOYMENT_TYPE_CONFIG.full_time
                const statusCfg = STATUS_CONFIG[emp.status] || STATUS_CONFIG.active

                return (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md border-border/70">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="size-12 rounded-xl ring-1 ring-border">
                              {emp.avatar_url && <AvatarImage src={emp.avatar_url} className="object-cover" />}
                              <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                                {`${emp.first_name[0]}${emp.last_name?.[0] ?? ''}`}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <Link to={`/app/employees/${emp.id}`} className="line-clamp-1 text-sm font-semibold hover:text-primary">
                                {emp.first_name} {emp.last_name}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">{emp.position ?? 'Logistics Staff'}</p>
                              <p className="truncate text-[11px] text-muted-foreground/70">{emp.departments?.name ?? 'Operations'}</p>
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
                                <Link to={`/app/employees/${emp.id}`}>View 201 File</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIdCardEmp(emp)}>
                                <QrCode className="mr-2 size-3.5" /> Print ID Badge
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setFaceEnrollEmp(emp)}>
                                <ShieldCheck className="mr-2 size-3.5" /> Face ID Enrollment
                              </DropdownMenuItem>
                              {can.manageEmployees() && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEdit(emp)}>Edit Profile</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-1 flex-wrap">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${typeConfig.className}`}>
                            {typeConfig.label}
                          </span>
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
                          <div className="ml-auto">
                            {emp.face_encoding ? (
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                                <ShieldCheck className="size-3" /> Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
                                <ShieldAlert className="size-3" /> No Face ID
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ================= VIEW 3: ORGANIZATION HIERARCHY CHART ================= */}
        <TabsContent value="org" className="mt-4 focus-visible:outline-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Users className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No hierarchy data available</p>
            </div>
          ) : (
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-8 bg-muted/20 overflow-hidden">
                <OrgChart employees={filtered} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Sticky Bulk Operations Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-foreground text-background shadow-2xl border border-background/20"
          >
            <span className="text-xs font-bold whitespace-nowrap bg-background/20 px-2.5 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>

            {can.manageEmployees() && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleBulkRegularize}
                  disabled={bulkActionPending}
                >
                  <Sparkles className="size-3.5 text-amber-500" /> Regularize
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleBulkStatusChange('active')}
                  disabled={bulkActionPending}
                >
                  <UserCheck className="size-3.5 text-emerald-500" /> Set Active
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleBulkStatusChange('on_leave')}
                  disabled={bulkActionPending}
                >
                  <Clock className="size-3.5 text-amber-500" /> Set On Leave
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 bg-transparent text-background border-background/30 hover:bg-background/10"
              onClick={handleExportCSV}
            >
              <Download className="size-3.5" /> Export Selected
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-background/60 hover:text-background hover:bg-background/10"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateEmp} onOpenChange={open => { if (!open) setDeactivateEmp(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivateEmp?.first_name} {deactivateEmp?.last_name}?
              They will lose access to system login and attendance clock-ins, but their historical 201 records, payroll, and timesheets will be retained for statutory audit compliance.
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
