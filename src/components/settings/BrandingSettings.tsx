import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organization'
import { supabase } from '@/lib/supabase'
import { Loader2, Upload } from 'lucide-react'

export function BrandingSettings() {
  const { data: org, isLoading } = useOrganization()
  const { mutateAsync: updateOrg, isPending } = useUpdateOrganization()
  
  const [color, setColor] = useState('#6366f1') // Default indigo
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (org?.primary_color) {
      setColor(org.primary_color)
    }
  }, [org?.primary_color])

  const handleColorSave = async () => {
    try {
      await updateOrg({ primary_color: color })
      toast.success('Brand color updated successfully')
    } catch (error) {
      toast.error('Failed to update brand color')
      console.error(error)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${org?.id}-${Math.random()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath)

      await updateOrg({ logo_url: publicUrl })
      toast.success('Organization logo updated')
    } catch (error) {
      toast.error('Failed to upload logo')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading branding settings...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">White-Label Branding</CardTitle>
        <CardDescription>Customize the visual identity of your platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-3">
          <Label>Organization Logo</Label>
          <div className="flex items-center gap-6">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 overflow-hidden">
              {org?.logo_url ? (
                <img src={org.logo_url} alt="Logo" className="size-full object-cover bg-white" />
              ) : (
                <span className="text-xs text-muted-foreground text-center px-2">No Logo</span>
              )}
            </div>
            
            <div className="space-y-1">
              <Button variant="outline" size="sm" className="relative overflow-hidden" disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </Button>
              <p className="text-xs text-muted-foreground">Recommended: Square PNG/JPG, at least 256x256px.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Primary Brand Color</Label>
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 items-center">
              <div 
                className="size-12 rounded-full border shadow-sm shrink-0" 
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center gap-2 max-w-sm w-full">
                <Input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 p-1 h-10 cursor-pointer"
                />
                <Input 
                  type="text" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono text-sm uppercase flex-1"
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <Button onClick={handleColorSave} disabled={isPending} className="w-fit">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Apply Theme Color
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
