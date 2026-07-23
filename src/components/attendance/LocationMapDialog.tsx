import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationMapDialogProps {
  clockInLocation?: { lat: number; lng: number };
  clockOutLocation?: { lat: number; lng: number };
}

export function LocationMapDialog({ clockInLocation, clockOutLocation }: LocationMapDialogProps) {
  const center = clockInLocation || clockOutLocation || { lat: 0, lng: 0 };
  
  if (!clockInLocation && !clockOutLocation) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2" title="View Location">
          <MapPin className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Clock Location</DialogTitle>
        </DialogHeader>
        <div className="h-[400px] w-full rounded-md overflow-hidden">
          <MapContainer 
            center={[center.lat, center.lng]} 
            zoom={15} 
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clockInLocation && (
              <Marker position={[clockInLocation.lat, clockInLocation.lng]}>
                <Popup>Clock In Location</Popup>
              </Marker>
            )}
            {clockOutLocation && (
              <Marker position={[clockOutLocation.lat, clockOutLocation.lng]}>
                <Popup>Clock Out Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
