import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Plus, Users, Edit2, Trash2, MoreHorizontal, Loader2,
  Search, Download, DollarSign, UserCheck, ShieldCheck, ArrowRight,
  TrendingUp, LayoutGrid, Table as TableIcon, CheckCircle2,
  ChevronRight, Sparkles, UserPlus, Phone, Mail, FileSpreadsheet
} from 'lucide-react'
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-misc'
import { useEmployees, useUpdateEmployee } from '@/hooks/use-employees'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Department, Employee } from '@/types'
import { downloadCSV } from '@/utils/export'

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#6366f1', gradient: 'from-indigo-500 to-purple-600' },
  { name: 'Violet', value: '#8b5cf6', gradient: 'from-violet-500 to-fuchsia-600' },
  { name: 'Emerald', value: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Amber', value: '#f59e0b', gradient: 'from-amber-500 to-orange-600' },
  { name: 'Sky', value: '#0ea5e9', gradient: 'from-sky-500 to-blue-600' },
  { name: 'Rose', value: '#f43f5e', gradient: 'from-pink-500 to-rose-600' },
  { name: 'Teal', value: '#14b8a6', gradient: 'from-teal-500 to-cyan-600' },
  { name: 'Orange', value: '#f97316', gradient: 'from-red-500 to-orange-500' },
]

type FormState = {
  name: string
  code: string
  description: string
  manager_id: string
  color: string
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  description: '',
  manager_id: '',
  color: '#6366f1',
}

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments()
  const { data: employees, refetch: refetchEmployees } = useEmployees()
  const { can } = usePermissions()

  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()
  const updateEmployeeMutation = useUpdateEmployee()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'grid' | 'table'>('grid')

  const [createOpen, setCreateOpen] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)
  const [viewStaffDept, setViewStaffDept] = useState<Department | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  // Reassign staff state inside roster modal
  const [reassigningEmp, setReassigningEmp] = useState<Employee | null>(null)
  const [targetDeptId, setTargetDeptId] = useState<string>('')

  // Map managers and members
  const deptStaffMap = useMemo(() => {
    const map = new Map<string, Employee[]>()
    departments?.forEach(d => map.set(d.id, []))
    employees?.forEach(e => {
      if (e.department_id && map.has(e.department_id)) {
        map.get(e.department_id)!.push(e)
      }
    })
    return map
  }, [departments, employees])

  // Summary Metrics
  const summary = useMemo(() => {
    const totalDepts = departments?.length ?? 0
    const totalEmployees = employees?.length ?? 0
    const assignedDepts = departments?.filter(d => (deptStaffMap.get(d.id)?.length ?? 0) > 0).length ?? 0
    
    let totalPayroll = 0
    employees?.forEach(e => {
      const sal = (e.salary_info as any) || {}
      if (sal.base_salary) totalPayroll += parseFloat(sal.base_salary)
    })

    return { totalDepts, totalEmployees, assignedDepts, totalPayroll }
  }, [departments, employees, deptStaffMap])

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    if (!departments) return []
    if (!search.trim()) return departments
    const q = search.toLowerCase()
    return departments.filter(d => {
      const manager = employees?.find(e => e.id === d.manager_id)
      const managerName = manager ? `${manager.first_name} ${manager.last_name}`.toLowerCase() : ''
      return (
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        managerName.includes(q)
      )
    })
  }, [departments, search, employees])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  const openEdit = (dept: Department) => {
    setEditDept(dept)
    setForm({
      name: dept.name,
      code: dept.code ?? '',
      description: dept.description ?? '',
      manager_id: dept.manager_id ?? '',
      color: dept.color || '#6366f1',
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
        manager_id: form.manager_id || undefined,
        color: form.color,
      })
      toast.success(`Department "${form.name}" created successfully`)
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create department')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDept) return
    try {
      await updateMutation.mutateAsync({
        id: editDept.id,
        name: form.name,
        code: form.code || undefined,
        description: form.description || undefined,
        manager_id: form.manager_id || undefined,
        color: form.color,
      })
      toast.success('Department updated successfully')
      setEditDept(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update department')
    }
  }

  const handleDelete = async () => {
    if (!deleteDept) return
    try {
      await deleteMutation.mutateAsync(deleteDept.id)
      toast.success(`Department "${deleteDept.name}" deleted`)
      setDeleteDept(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete department')
    }
  }

  const handleReassignMember = async () => {
    if (!reassigningEmp) return
    try {
      await updateEmployeeMutation.mutateAsync({
        id: reassigningEmp.id,
        department_id: targetDeptId || null,
      })
      toast.success(`Reassigned ${reassigningEmp.first_name} to ${departments?.find(d => d.id === targetDeptId)?.name || 'Unassigned'}`)
      setReassigningEmp(null)
      setTargetDeptId('')
      refetchEmployees()
    } catch (err: any) {
      toast.error('Reassignment failed: ' + err.message)
    }
  }

  // Export Department Masterlist
  const handleExportCSV = () => {
    if (!departments || !departments.length) {
      toast.error('No departments to export')
      return
    }

    const exportData = departments.map(d => {
      const staff = deptStaffMap.get(d.id) || []
      const manager = employees?.find(e => e.id === d.manager_id)
      let deptSalary = 0
      staff.forEach(s => {
        const sal = (s.salary_info as any) || {}
        if (sal.base_salary) deptSalary += parseFloat(sal.base_salary)
      })

      return {
        'Department Name': d.name,
        'Code': d.code || '',
        'Head / Manager': manager ? `${manager.first_name} ${manager.last_name}` : 'Unassigned',
        'Headcount': staff.length,
        'Monthly Payroll (PHP)': deptSalary.toFixed(2),
        'Description': d.description || '',
      }
    })

    downloadCSV(exportData, `WorkforcePro_Departments_Summary_${new Date().toISOString().split('T')[0]}`)
    toast.success('Department summary exported to CSV')
  }

  const activeStaffList = viewStaffDept ? (deptStaffMap.get(viewStaffDept.id) || []) : []

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Department & Unit Management</h1>
          <p className="text-sm text-muted-foreground">
            Structure organizational units, assign department heads, and monitor departmental labor allocation
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={handleExportCSV}>
            <Download className="size-4" />
            Export Summary
          </Button>
          {can.manageEmployees() && (
            <Button className="gap-1.5" onClick={openCreate}>
              <Plus className="size-4" />
              New Department
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.totalDepts}</p>
              <p className="text-xs text-muted-foreground font-medium">Departments</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              <p className="text-xs text-muted-foreground font-medium">Assigned Personnel</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <UserCheck className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments?.filter(d => !!d.manager_id).length || 0}</p>
              <p className="text-xs text-muted-foreground font-medium">Appointed Leads</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold truncate">
                ₱{summary.totalPayroll > 0 ? (summary.totalPayroll / 1000).toFixed(1) + 'k' : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Est. Monthly Labor</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-border/70 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by department name, code, manager..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="ml-auto">
            <TabsList className="bg-muted/70">
              <TabsTrigger value="grid" className="gap-1 text-xs">
                <LayoutGrid className="size-3.5" /> Matrix View
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1 text-xs">
                <TableIcon className="size-3.5" /> High-Density Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* TAB CONTENT: MATRIX / GRID VIEW */}
      {activeTab === 'grid' && (
        isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="space-y-3">
                  <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-full bg-muted rounded animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <Building2 className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No departments found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDepartments.map((dept, i) => {
              const staff = deptStaffMap.get(dept.id) || []
              const manager = employees?.find(e => e.id === dept.manager_id)
              const preset = COLOR_PRESETS.find(c => c.value === dept.color) || COLOR_PRESETS[i % COLOR_PRESETS.length]
              
              let deptPayroll = 0
              staff.forEach(s => {
                const sal = (s.salary_info as any) || {}
                if (sal.base_salary) deptPayroll += parseFloat(sal.base_salary)
              })

              return (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md border-border/70 flex flex-col h-full">
                    <div className={`h-2.5 bg-gradient-to-r ${preset.gradient}`} />
                    <CardContent className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${preset.gradient} text-white shadow-xs`}>
                            <Building2 className="size-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground line-clamp-1">{dept.name}</h3>
                            {dept.code && (
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 mt-0.5">
                                {dept.code}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewStaffDept(dept)}>
                              <Users className="mr-2 size-3.5" /> View Personnel Roster
                            </DropdownMenuItem>
                            {can.manageEmployees() && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(dept)}>
                                  <Edit2 className="mr-2 size-3.5" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDept(dept)}>
                                  <Trash2 className="mr-2 size-3.5" /> Delete Department
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {dept.description && (
                        <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2">{dept.description}</p>
                      )}

                      <div className="mt-4 pt-3 border-t border-border space-y-2 text-xs flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Department Lead:</span>
                          {manager ? (
                            <span className="font-semibold text-foreground truncate max-w-[130px]">
                              {manager.first_name} {manager.last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Unassigned</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Monthly Payroll:</span>
                          <span className="font-bold text-emerald-600">
                            ₱{deptPayroll.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <button
                          onClick={() => setViewStaffDept(dept)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <Users className="size-3.5" />
                          <span>{staff.length} {staff.length === 1 ? 'member' : 'members'}</span>
                          <ChevronRight className="size-3" />
                        </button>

                        <div className="flex -space-x-1.5 overflow-hidden">
                          {staff.slice(0, 3).map(member => (
                            <Avatar key={member.id} className="size-6 border border-background ring-1 ring-border">
                              {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {member.first_name[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )
      )}

      {/* TAB CONTENT: HIGH DENSITY TABLE VIEW */}
      {activeTab === 'table' && (
        <Card className="border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department Lead / Manager</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Estimated Payroll</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDepartments.map((dept, i) => {
                  const staff = deptStaffMap.get(dept.id) || []
                  const manager = employees?.find(e => e.id === dept.manager_id)
                  const preset = COLOR_PRESETS.find(c => c.value === dept.color) || COLOR_PRESETS[i % COLOR_PRESETS.length]
                  
                  let deptPayroll = 0
                  staff.forEach(s => {
                    const sal = (s.salary_info as any) || {}
                    if (sal.base_salary) deptPayroll += parseFloat(sal.base_salary)
                  })

                  return (
                    <tr key={dept.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-2.5">
                        <div className={`size-3 rounded-full bg-gradient-to-r ${preset.gradient}`} />
                        {dept.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {dept.code ? (
                          <Badge variant="outline" className="text-xs font-mono">{dept.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {manager ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              {manager.avatar_url && <AvatarImage src={manager.avatar_url} />}
                              <AvatarFallback className="text-[9px]">{manager.first_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{manager.first_name} {manager.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setViewStaffDept(dept)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <Users className="size-3.5" />
                          <span>{staff.length} staff</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-600">
                        ₱{deptPayroll.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-[200px]">
                        {dept.description || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setViewStaffDept(dept)}>
                            <Users className="size-3.5" /> Roster
                          </Button>
                          {can.manageEmployees() && (
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(dept)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DEPARTMENT STAFF ROSTER DRAWER / MODAL */}
      <Dialog open={!!viewStaffDept} onOpenChange={(op) => !op && setViewStaffDept(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {viewStaffDept?.name} — Personnel Roster
            </DialogTitle>
            <DialogDescription>
              {activeStaffList.length} assigned employees in this organizational unit.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {activeStaffList.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-xl">
                <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold">No personnel assigned to this department yet</p>
                <p className="text-xs text-muted-foreground">Assign employees via the Employee Directory.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {activeStaffList.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 ring-1 ring-border">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {member.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link to={`/app/employees/${member.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                          {member.first_name} {member.last_name}
                        </Link>
                        <p className="text-muted-foreground">{member.position || 'Staff'} • {member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {member.employment_type?.replace('_', ' ') || 'Full Time'}
                      </Badge>

                      {member.face_encoding ? (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Enrolled
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                          Missing Face ID
                        </span>
                      )}

                      {can.manageEmployees() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setReassigningEmp(member)
                            setTargetDeptId(member.department_id || '')
                          }}
                        >
                          Transfer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewStaffDept(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEMBER REASSIGNMENT DIALOG */}
      <Dialog open={!!reassigningEmp} onOpenChange={(op) => !op && setReassigningEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Employee Department</DialogTitle>
            <DialogDescription>
              Reassign {reassigningEmp?.first_name} {reassigningEmp?.last_name} to another organizational unit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <Label className="text-xs">Select Target Department</Label>
            <Select value={targetDeptId} onValueChange={setTargetDeptId}>
              <SelectTrigger><SelectValue placeholder="Choose Department" /></SelectTrigger>
              <SelectContent>
                {departments?.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassigningEmp(null)}>Cancel</Button>
            <Button onClick={handleReassignMember} disabled={updateEmployeeMutation.isPending}>
              {updateEmployeeMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE DEPARTMENT DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>Define a new organizational unit and assign a department head.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="mt-2 space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs">Department Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Customs & Brokerage Operations"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Department Code</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CBO"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Department Color Tag</Label>
                <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_PRESETS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full" style={{ backgroundColor: c.value }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Department Head / Manager</Label>
              <Select value={form.manager_id} onValueChange={v => setForm(p => ({ ...p, manager_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign a manager (optional)" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.position || 'Staff'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Operational purpose or scope"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DEPARTMENT DIALOG */}
      <Dialog open={!!editDept} onOpenChange={open => !open && setEditDept(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department details, code, or assigned lead.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="mt-2 space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs">Department Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Department Code</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={6}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color Theme</Label>
                <Select value={form.color} onValueChange={v => setForm(p => ({ ...p, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_PRESETS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full" style={{ backgroundColor: c.value }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Department Head / Manager</Label>
              <Select value={form.manager_id} onValueChange={v => setForm(p => ({ ...p, manager_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign a manager" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.position || 'Staff'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDept(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteDept} onOpenChange={open => !open && setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDept?.name}</strong>?
              Employees currently assigned to this department will have their department unlinked, but their employee profiles and payroll history will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
