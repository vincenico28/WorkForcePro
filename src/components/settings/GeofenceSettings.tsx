import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase, ORG_ID } from '@/lib/supabase'
import {
  MapPin, Save, Loader2, LocateFixed, Maximize, Minimize,
  ShieldCheck, ShieldAlert, Globe, AlertTriangle
} from 'lucide-react'

// Fix standard Leaflet marker icons in Vite
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

export interface GeofenceData {
  lat: number
  lng: number
  radius: number
  enabled?: boolean
}

// Fallback to Env variables if DB is empty, or default to some coordinates
const DEFAULT_LAT = Number(import.meta.env.VITE_OFFICE_LAT) || 14.5995
const DEFAULT_LNG = Number(import.meta.env.VITE_OFFICE_LNG) || 120.9842
const DEFAULT_RADIUS = Number(import.meta.env.VITE_ALLOWED_RADIUS_METERS) || 100

function MapClickHandler({ setLocation }: { setLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function GeofenceSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [location, setLocation] = useState<GeofenceData>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    radius: DEFAULT_RADIUS,
    enabled: true,
  })
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  const isEnabled = location.enabled !== false

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('geofence_settings')
          .eq('id', ORG_ID)
          .maybeSingle()

        if (error) throw error
        
        if (data?.geofence_settings) {
          const settings = data.geofence_settings as GeofenceData
          setLocation({
            lat: settings.lat ?? DEFAULT_LAT,
            lng: settings.lng ?? DEFAULT_LNG,
            radius: settings.radius ?? DEFAULT_RADIUS,
            enabled: settings.enabled !== false, // default true
          })
        }
      } catch (err: any) {
        toast.error('Failed to load geofence settings', { description: err.message })
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()

    // Try to get the user's current physical location for testing/setup
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Could not get personal location', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
  }, [])

  // Recentering map when fetched
  useEffect(() => {
    if (mapRef.current && !loading) {
      mapRef.current.setView([location.lat, location.lng], mapRef.current.getZoom())
    }
  }, [loading, location.lat, location.lng])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        setTimeout(() => mapRef.current?.invalidateSize(), 300)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const handleSave = async (updatedData?: Partial<GeofenceData>) => {
    setSaving(true)
    const payload = { ...location, ...(updatedData || {}) }
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ geofence_settings: payload })
        .eq('id', ORG_ID)

      if (error) throw error
      setLocation(payload)
      toast.success(
        payload.enabled === false
          ? 'Geofence disabled: Remote & flexible clock-in allowed'
          : 'Geofence enforcement active & settings saved'
      )
    } catch (err: any) {
      toast.error('Failed to save settings', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (checked: boolean) => {
    setLocation(prev => ({ ...prev, enabled: checked }))
    await handleSave({ enabled: checked })
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setLocation(prev => ({ ...prev, lat, lng }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Office Geofence & Location Enforcement
            </CardTitle>
            <CardDescription>
              Configure spatial boundaries and toggle enforcement to allow or restrict remote mobile clock-ins.
            </CardDescription>
          </div>
          <Badge
            className={`px-3 py-1 text-xs font-semibold gap-1.5 shrink-0 ${
              isEnabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isEnabled ? <ShieldCheck className="size-3.5 text-emerald-600" /> : <Globe className="size-3.5 text-amber-600" />}
            {isEnabled ? 'Geofence Active' : 'Remote Clock-in Allowed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* On/Off Geofence Enforcement Toggle Box */}
        <div className={`p-4 rounded-xl border transition-all ${
          isEnabled
            ? 'bg-emerald-50/50 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/50'
            : 'bg-amber-50/50 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/50'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="geofence-switch" className="text-sm font-bold text-foreground cursor-pointer">
                  {isEnabled ? 'Enforce Office Location Geofence (ON)' : 'Allow Clock-In From Anywhere / Remote (OFF)'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEnabled
                  ? 'Employees must be physically present within the designated radius to clock in or clock out. Clock-in is strictly blocked if outside the radius.'
                  : 'Geofence restrictions are bypassed. Employees can clock in and out from home, client sites, or field dispatch locations regardless of distance.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="geofence-switch"
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Spatial Radius Configuration */}
        <div className={`space-y-4 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-60'}`}>
          <div className="flex justify-between items-center">
            <Label className="font-semibold text-xs text-foreground">
              Allowed Clock-in Radius: <span className="font-bold text-primary text-sm">{location.radius} meters</span>
            </Label>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          </div>
          <Slider
            value={[location.radius]}
            min={10}
            max={5000}
            step={10}
            onValueChange={([val]) => setLocation(prev => ({ ...prev, radius: val }))}
          />
        </div>

        <div className="flex justify-between items-center mb-2">
          {myLocation && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5 text-xs h-7" 
              onClick={() => {
                setLocation(prev => ({ ...prev, lat: myLocation.lat, lng: myLocation.lng }))
                mapRef.current?.setView([myLocation.lat, myLocation.lng], 17)
              }}
            >
              <LocateFixed className="size-3" />
              Snap Office to My Location
            </Button>
          )}
        </div>

        <div className={isFullscreen ? "fixed inset-0 z-[9999] bg-background flex flex-col" : "h-[380px] w-full rounded-xl overflow-hidden border border-border relative z-0"}>
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler setLocation={handleLocationChange} />
            
            <Marker 
              position={[location.lat, location.lng]} 
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target
                  const position = marker.getLatLng()
                  handleLocationChange(position.lat, position.lng)
                }
              }}
            />
            <Circle
              center={[location.lat, location.lng]}
              radius={location.radius}
              pathOptions={{
                fillColor: isEnabled ? 'hsl(var(--primary))' : '#f59e0b',
                color: isEnabled ? 'hsl(var(--primary))' : '#f59e0b',
                fillOpacity: isEnabled ? 0.2 : 0.08,
                dashArray: isEnabled ? undefined : '6, 6'
              }}
            />
            {myLocation && (
              <Circle
                center={[myLocation.lat, myLocation.lng]}
                radius={5}
                pathOptions={{ fillColor: '#3b82f6', color: '#2563eb', fillOpacity: 1, weight: 2 }}
              />
            )}
          </MapContainer>
          <div className="absolute top-2 right-2 z-[10000] flex gap-2">
            <div className="bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border shadow-sm text-xs pointer-events-none flex items-center">
              Click map or drag pin to move hub
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm pointer-events-auto shadow-sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsFullscreen(!isFullscreen)
                setTimeout(() => mapRef.current?.invalidateSize(), 300)
              }}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            {!isEnabled && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="size-3.5" /> Remote clock-in is currently active.
              </span>
            )}
          </p>
          <Button onClick={() => handleSave()} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Geofence Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
