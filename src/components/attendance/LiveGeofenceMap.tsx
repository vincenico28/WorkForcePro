import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { supabase, ORG_ID } from '@/lib/supabase'

// Fix default marker icons
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface LiveGeofenceMapProps {
  userLocation: { lat: number; lng: number } | null
}

export function LiveGeofenceMap({ userLocation }: LiveGeofenceMapProps) {
  const [officeSettings, setOfficeSettings] = useState<{lat: number, lng: number, radius: number} | null>(null)

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('organizations').select('geofence_settings').eq('id', ORG_ID).single()
      
      let lat = import.meta.env.VITE_OFFICE_LAT ? parseFloat(import.meta.env.VITE_OFFICE_LAT) : 14.5995
      let lng = import.meta.env.VITE_OFFICE_LNG ? parseFloat(import.meta.env.VITE_OFFICE_LNG) : 120.9842
      let radius = import.meta.env.VITE_ALLOWED_RADIUS_METERS ? parseInt(import.meta.env.VITE_ALLOWED_RADIUS_METERS) : 100

      if (data?.geofence_settings) {
        const settings = data.geofence_settings as { lat: number; lng: number; radius: number }
        lat = settings.lat
        lng = settings.lng
        radius = settings.radius
      }
      
      setOfficeSettings({ lat, lng, radius })
    }
    fetchSettings()
  }, [])

  if (!officeSettings || !userLocation) {
    return (
      <div className="h-[200px] w-full rounded-lg bg-muted flex items-center justify-center border animate-pulse">
        <p className="text-sm text-muted-foreground">Locating GPS Coordinates...</p>
      </div>
    )
  }

  // Calculate if user is inside
  const R = 6371e3
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(officeSettings.lat - userLocation.lat)
  const dLon = toRad(officeSettings.lng - userLocation.lng)
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(userLocation.lat))*Math.cos(toRad(officeSettings.lat))*Math.sin(dLon/2)*Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  const isInside = distance <= officeSettings.radius

  return (
    <div className="h-[200px] w-full rounded-lg overflow-hidden border relative z-0 mb-6 shadow-inner">
      <MapContainer 
        center={[officeSettings.lat, officeSettings.lng]} 
        zoom={17} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* The Geofence Zone */}
        <Circle 
          center={[officeSettings.lat, officeSettings.lng]}
          pathOptions={{ 
            fillColor: isInside ? '#10b981' : '#ef4444', 
            fillOpacity: 0.2,
            color: isInside ? '#10b981' : '#ef4444',
            weight: 2
          }}
          radius={officeSettings.radius}
        />

        {/* User Location */}
        <Marker position={[userLocation.lat, userLocation.lng]}>
          <Popup>
            <div className="text-center font-sans">
              <p className="font-bold text-sm">Your Location</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(distance)}m from office
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Status Overlay */}
      <div className="absolute top-2 right-2 z-[400]">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-md ${isInside ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {isInside ? 'Inside Zone' : 'Outside Zone'}
        </span>
      </div>
    </div>
  )
}
