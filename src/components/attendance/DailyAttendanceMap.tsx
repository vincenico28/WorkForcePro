import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AttendanceRecord } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

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

function getStringColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  // Ensure the color is not too light/white so it shows up on the map
  const color = '#' + '00000'.substring(0, 6 - c.length) + c;
  return color;
}

function createCustomIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32px" height="32px" stroke="white" stroke-width="1.5">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker bg-transparent border-none',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

interface DailyAttendanceMapProps {
  records: AttendanceRecord[];
}

export function DailyAttendanceMap({ records }: DailyAttendanceMapProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Filter out records that don't have a clockIn location
  const recordsWithLocation = records.filter(
    (record) => (record.location as any)?.clockIn
  );

  // Default center (e.g., somewhere central or the first record)
  const center = recordsWithLocation.length > 0 
    ? [(recordsWithLocation[0].location as any).clockIn.lat, (recordsWithLocation[0].location as any).clockIn.lng]
    : [0, 0];

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Live Attendance Map</CardTitle>
          <CardDescription>View the clock-in locations of all employees today</CardDescription>
        </div>
        {recordsWithLocation.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setIsFullScreen(true)} className="gap-2">
            <Maximize2 className="size-4" />
            <span className="hidden sm:inline">Full Screen</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {recordsWithLocation.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No geographic data available for today's attendance records.
          </div>
        ) : (
          <div className="h-[400px] w-full rounded-md overflow-hidden border z-0">
            <MapContainer 
              center={center as [number, number]} 
              zoom={13} 
              scrollWheelZoom={false}
              className="h-full w-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {recordsWithLocation.map((record) => {
                const loc = (record.location as any).clockIn;
                const markerColor = getStringColor(record.employee_id || record.id);
                return (
                  <Marker key={record.id} position={[loc.lat, loc.lng]} icon={createCustomIcon(markerColor)}>
                    <Popup>
                      <div className="flex flex-col gap-2 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {`${record.employees?.first_name?.[0] ?? ''}${record.employees?.last_name?.[0] ?? ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-none">{record.employees?.first_name} {record.employees?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{record.employees?.position}</p>
                          </div>
                        </div>
                        <div className="text-xs mt-1">
                          <p><strong>Clock In:</strong> {record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : 'N/A'}</p>
                          <p><strong>Status:</strong> <span className="capitalize">{record.status}</span></p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}
      </CardContent>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-none w-screen h-[100dvh] m-0 p-0 rounded-none border-none sm:max-w-none flex flex-col">
          <div className="flex-1 h-full w-full z-0 relative">
            <MapContainer 
              center={center as [number, number]} 
              zoom={13} 
              scrollWheelZoom={true}
              className="h-full w-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {recordsWithLocation.map((record) => {
                const loc = (record.location as any).clockIn;
                const markerColor = getStringColor(record.employee_id || record.id);
                return (
                  <Marker key={`fs-${record.id}`} position={[loc.lat, loc.lng]} icon={createCustomIcon(markerColor)}>
                    <Popup>
                      <div className="flex flex-col gap-2 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {`${record.employees?.first_name?.[0] ?? ''}${record.employees?.last_name?.[0] ?? ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-none">{record.employees?.first_name} {record.employees?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{record.employees?.position}</p>
                          </div>
                        </div>
                        <div className="text-xs mt-1">
                          <p><strong>Clock In:</strong> {record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : 'N/A'}</p>
                          <p><strong>Status:</strong> <span className="capitalize">{record.status}</span></p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
