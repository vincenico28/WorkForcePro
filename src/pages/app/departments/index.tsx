import { useState } from 'react'
import { Building2, Plus, Users, Edit2, Trash2, MoreHorizontal, Loader2 } from 'lucide-react'
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-misc'
import { useEmployees } from '@/hooks/use-employees'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Department } from '@/types'

const DEPT_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-violet-500 to-fuchsia-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-red-500 to-orange-500',
  'from-teal-500 to-cyan-600',
]

type FormState = { name: string; code: string; description: string }
const EMPTY_FORM: FormState = { name: '', code: '', description: '' }

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments()
  const { data: employees } = useEmployees()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const [createOpen, setCreateOpen] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [deleteDept, setDeleteDept] = useState<Department | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const getHeadcount = (deptId: string) =>
    employees?.filter(e => e.department_id === deptId).length ?? 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync(form)
      toast.success('Department created')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDept) return
    try {
      await updateMutation.mutateAsync({ id: editDept.id, ...form })
      toast.success('Department updated')
      setEditDept(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteDept) return
    try {
      await deleteMutation.mutateAsync(deleteDept.id)
      toast.success('Department deleted')
      setDeleteDept(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const openEdit = (dept: Department) => {
    setEditDept(dept)
    setForm({ name: dept.name, code: dept.code ?? '', description: dept.description ?? '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {departments?.length ?? 0} departments · {employees?.length ?? 0} total employees
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
          <Plus className="size-4" />New Department
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {departments?.map((dept, i) => {
            const headcount = getHeadcount(dept.id)
            return (
              <Card key={dept.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className={`h-2 bg-gradient-to-r ${DEPT_GRADIENTS[i % DEPT_GRADIENTS.length]}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${DEPT_GRADIENTS[i % DEPT_GRADIENTS.length]} text-white`}>
                      <Building2 className="size-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(dept)}>
                          <Edit2 className="mr-2 size-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDept(dept)}>
                          <Trash2 className="mr-2 size-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-semibold">{dept.name}</h3>
                    {dept.code && (
                      <Badge variant="secondary" className="mt-1 text-xs">{dept.code}</Badge>
                    )}
                    {dept.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{dept.description}</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    <span>{headcount} employee{headcount !== 1 ? 's' : ''}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Department</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="mt-2 space-y-4">
            <DeptFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDept} onOpenChange={open => !open && setEditDept(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="mt-2 space-y-4">
            <DeptFormFields form={form} setForm={setForm} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDept(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteDept} onOpenChange={open => !open && setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDept?.name}</strong>? This action cannot be undone.
              Employees in this department will have their department unset.
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

function DeptFormFields({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Department Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Engineering"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Code</Label>
        <Input
          value={form.code}
          onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
          placeholder="e.g. ENG"
          maxLength={5}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Optional description"
        />
      </div>
    </>
  )
}
