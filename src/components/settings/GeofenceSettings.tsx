import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Save, Loader2, MapPin, LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, ORG_ID } from '@/lib/supabase'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

interface GeofenceData {
  lat: number
  lng: number
  radius: number
}

// Fallback to Env variables if DB is empty, or default to some coordinates
const DEFAULT_LAT = Number(import.meta.env.VITE_OFFICE_LAT) || 40.7128
const DEFAULT_LNG = Number(import.meta.env.VITE_OFFICE_LNG) || -74.0060
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
  const [location, setLocation] = useState<GeofenceData>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, radius: DEFAULT_RADIUS })
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const mapRef = useRef<L.Map | null>(null)

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
          setLocation(data.geofence_settings as GeofenceData)
        }
      } catch (err: any) {
        toast.error('Failed to load geofence settings', { description: err.message })
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()

    // Also try to get the user's current physical location for testing/setup
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ geofence_settings: location })
        .eq('id', ORG_ID)

      if (error) throw error
      toast.success('Geofence settings saved successfully')
    } catch (err: any) {
      toast.error('Failed to save settings', { description: err.message })
    } finally {
      setSaving(false)
    }
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          Global Office Location
        </CardTitle>
        <CardDescription>
          Set the exact coordinates of your office and the allowed radius for mobile clock-ins.
          Employees outside this circle will be blocked from clocking in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Allowed Clock-in Radius: {location.radius} meters</Label>
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
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-border relative z-0">
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
              pathOptions={{ fillColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))', fillOpacity: 0.2 }}
            />
            {myLocation && (
              <Circle
                center={[myLocation.lat, myLocation.lng]}
                radius={5}
                pathOptions={{ fillColor: '#3b82f6', color: '#2563eb', fillOpacity: 1, weight: 2 }}
              />
            )}
          </MapContainer>
          <div className="absolute top-2 right-2 z-[1000] bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border shadow-sm text-xs pointer-events-none">
            Click map or drag pin to move
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Geofence
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
