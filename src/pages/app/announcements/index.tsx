import { useState } from 'react'
import { format } from 'date-fns'
import { Megaphone, Pin, AlertTriangle, Calendar, Info, FileText, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from '@/hooks/use-misc'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const TYPE_CONFIG = {
  general: { label: 'General', icon: Info, className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  urgent: { label: 'Urgent', icon: AlertTriangle, className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  event: { label: 'Event', icon: Calendar, className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400' },
  policy: { label: 'Policy', icon: FileText, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
}

function CreateAnnouncementDialog() {
  const { employee } = useAuthStore()
  const { mutateAsync, isPending } = useCreateAnnouncement()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'general' as const,
    is_pinned: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) {
      toast.error('Title and content are required')
      return
    }
    try {
      await mutateAsync({ ...form, author_id: employee?.id })
      toast.success('Announcement published')
      setOpen(false)
      setForm({ title: '', content: '', type: 'general', is_pinned: false })
    } catch (err: any) {
      toast.error('Failed to publish announcement', { description: err.message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Announcement title"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex items-center gap-2">
                      <cfg.icon className="size-3.5" />
                      {cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Content *</Label>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Write your announcement..."
              rows={5}
              required
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pin announcement</p>
              <p className="text-xs text-muted-foreground">Keep at top of list</p>
            </div>
            <Switch
              checked={form.is_pinned}
              onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Publishing...</> : 'Publish'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditAnnouncementDialog({ ann, onClose }: { ann: any; onClose: () => void }) {
  const { mutateAsync, isPending } = useUpdateAnnouncement()
  const [form, setForm] = useState({
    title: ann.title ?? '',
    content: ann.content ?? '',
    type: ann.type ?? 'general',
    is_pinned: ann.is_pinned ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) { toast.error('Title and content are required'); return }
    try {
      await mutateAsync({ id: ann.id, ...form })
      toast.success('Announcement updated')
      onClose()
    } catch (err: any) {
      toast.error('Failed to update announcement', { description: err.message })
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Announcement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_CONFIG).map(([k, cfg]) => (
                  <SelectItem key={k} value={k}>
                    <div className="flex items-center gap-2"><cfg.icon className="size-3.5" />{cfg.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Content *</Label>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} required />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pin announcement</p>
              <p className="text-xs text-muted-foreground">Keep at top of list</p>
            </div>
            <Switch checked={form.is_pinned} onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  const { can } = usePermissions()
  const { employee } = useAuthStore()
  const { mutateAsync: deleteAnn } = useDeleteAnnouncement()
  const [editingAnn, setEditingAnn] = useState<any | null>(null)

  const pinned = announcements?.filter(a => a.is_pinned) ?? []
  const regular = announcements?.filter(a => !a.is_pinned) ?? []

  const handleDelete = async (id: string) => {
    try {
      await deleteAnn(id)
      toast.success('Announcement deleted')
    } catch (err: any) {
      toast.error('Failed to delete announcement', { description: err.message })
    }
  }

  const canManage = (ann: any) =>
    can.isHR() || ann.author_id === employee?.id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Company-wide news and updates</p>
        </div>
        {can.createAnnouncements() && <CreateAnnouncementDialog />}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Pin className="size-4" />
                Pinned
              </div>
              {pinned.map(ann => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  canManage={canManage(ann)}
                  onEdit={() => setEditingAnn(ann)}
                  onDelete={() => handleDelete(ann.id)}
                />
              ))}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="text-sm font-medium text-muted-foreground">Latest</div>
              )}
              {regular.map(ann => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  canManage={canManage(ann)}
                  onEdit={() => setEditingAnn(ann)}
                  onDelete={() => handleDelete(ann.id)}
                />
              ))}
            </div>
          )}
          {announcements?.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <Megaphone className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">No announcements</p>
              <p className="text-xs text-muted-foreground">Post an announcement to keep your team informed</p>
            </div>
          )}
        </div>
      )}

      {editingAnn && (
        <EditAnnouncementDialog ann={editingAnn} onClose={() => setEditingAnn(null)} />
      )}
    </div>
  )
}

function AnnouncementCard({ ann, canManage, onEdit, onDelete }: {
  ann: any
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.general
  const Icon = cfg.icon

  return (
    <Card className={`transition-shadow hover:shadow-md ${ann.is_pinned ? 'border-primary/30' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${cfg.className}`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {ann.is_pinned && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Pin className="size-2.5" />
                  Pinned
                </Badge>
              )}
              <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1">{ann.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {`${ann.employees?.first_name?.[0] ?? ''}${ann.employees?.last_name?.[0] ?? ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {ann.employees?.first_name} {ann.employees?.last_name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {ann.published_at ? format(new Date(ann.published_at), 'MMM d, h:mm a') : ''}
                </span>
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{ann.title}". This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
