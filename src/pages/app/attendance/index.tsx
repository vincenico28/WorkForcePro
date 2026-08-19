import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns'
import {
  Clock, CheckCircle, XCircle, AlertCircle, TimerReset, MapPin, Download,
  Loader2, Camera, ShieldCheck, ShieldAlert, Globe, SwitchCamera, Sliders,
  PlusCircle, Edit2, Trash2, Printer, Search, Building2, Filter, AlertTriangle,
  FileSpreadsheet, UserCheck, Users, Eye, CheckSquare, Sparkles, Check, MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  useAttendance, useAttendanceRange, useClockIn, useClockOut,
  useTodayAttendance, useManualAttendanceRecord, useDeleteAttendanceRecord
} from '@/hooks/use-attendance'
import { useEmployees } from '@/hooks/use-employees'
import { useDepartments } from '@/hooks/use-misc'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
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
import { WebcamCapture } from '@/components/face-recognition/WebcamCapture'
import { LocationMapDialog } from '@/components/attendance/LocationMapDialog'
import { DailyAttendanceMap } from '@/components/attendance/DailyAttendanceMap'
import { LiveGeofenceMap } from '@/components/attendance/LiveGeofenceMap'
import { playSuccessSound, playErrorSound } from '@/utils/audio'
import { toast } from 'sonner'
import { downloadCSV } from '@/utils/export'
import { calculateDistance } from '@/utils/geo'
import { supabase, ORG_ID } from '@/lib/supabase'
import type { AttendanceRecord, Employee } from '@/types'

const ATT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  present: { label: 'Present', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  late: { label: 'Late', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: AlertCircle },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: XCircle },
  holiday: { label: 'Holiday', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', icon: CheckCircle },
  half_day: { label: 'Half Day', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400', icon: AlertCircle },
  ob: { label: 'Official Business (OB)', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400', icon: Globe },
}

interface GeofenceState {
  lat: number
  lng: number
  radius: number
  enabled: boolean
}

// ================= CLOCK WIDGET COMPONENT =================
function ClockWidget({ geofenceSettings }: { geofenceSettings: GeofenceState | null }) {
  const { employee } = useAuthStore()
  const { data: todayAtt, refetch } = useTodayAttendance(employee?.id ?? '')
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isIn = !!todayAtt?.clock_in && !todayAtt?.clock_out
  const isDone = !!todayAtt?.clock_in && !!todayAtt?.clock_out

  const [showFaceVerification, setShowFaceVerification] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null)
  const [checkingPermissions, setCheckingPermissions] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  const isGeofenceActive = geofenceSettings?.enabled !== false

  useEffect(() => {
    let watcher: number
    if (permissionsGranted) {
      watcher = navigator.geolocation.watchPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Watch position error:", err),
        { enableHighAccuracy: true, maximumAge: 0 }
      )
    }
    return () => {
      if (watcher) navigator.geolocation.clearWatch(watcher)
    }
  }, [permissionsGranted])

  useEffect(() => {
    const checkSilent = async () => {
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' })
        // @ts-ignore
        const camStatus = await navigator.permissions.query({ name: 'camera' })
        if (geoStatus.state === 'granted' && camStatus.state === 'granted') {
          setPermissionsGranted(true)
        }
      } catch (e) {}
    }
    checkSilent()
  }, [])

  const requestPermissions = async () => {
    setCheckingPermissions(true)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())

      if (!navigator.geolocation) {
        throw new Error('Geolocation API not supported in this browser')
      }
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      setPermissionsGranted(true)
      toast.success('Permissions granted successfully!')
    } catch (err: any) {
      toast.error('Permissions required', { description: 'Camera and exact GPS access required for verified biometric clock-in.' })
      setPermissionsGranted(false)
    } finally {
      setCheckingPermissions(false)
    }
  }

  const handleClockClick = () => {
    if (!employee?.id) { toast.error('No employee profile linked'); return }
    if ((employee as any).face_encoding) {
      setShowFaceVerification(true)
    } else {
      executeClock()
    }
  }

  const executeClock = async () => {
    let location: { lat: number; lng: number } | undefined
    
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000,
            maximumAge: 0
          })
        })
        
        if (isGeofenceActive && position.coords.accuracy > 60) {
          toast.error(`GPS Error`, { description: `Signal is too weak (${Math.round(position.coords.accuracy)}m). Please step near a window for a valid GPS lock.` })
          setShowFaceVerification(false)
          return
        }
        
        location = { lat: position.coords.latitude, lng: position.coords.longitude }
        
        const { data: org } = await supabase
          .from('organizations')
          .select('geofence_settings')
          .eq('id', ORG_ID)
          .single()
          
        let officeLat = import.meta.env.VITE_OFFICE_LAT ? parseFloat(import.meta.env.VITE_OFFICE_LAT) : 14.5995
        let officeLng = import.meta.env.VITE_OFFICE_LNG ? parseFloat(import.meta.env.VITE_OFFICE_LNG) : 120.9842
        let allowedRadius = import.meta.env.VITE_ALLOWED_RADIUS_METERS ? parseInt(import.meta.env.VITE_ALLOWED_RADIUS_METERS) : 100
        let isEnabled = true

        if (org?.geofence_settings) {
          const settings = org.geofence_settings as { lat: number; lng: number; radius: number; enabled?: boolean }
          officeLat = settings.lat ?? officeLat
          officeLng = settings.lng ?? officeLng
          allowedRadius = settings.radius ?? allowedRadius
          if (settings.enabled !== undefined) {
            isEnabled = settings.enabled
          }
        }

        if (isEnabled && officeLat !== null && officeLng !== null && !isNaN(officeLat) && !isNaN(officeLng)) {
          const distance = calculateDistance(location.lat, location.lng, officeLat, officeLng)
          if (distance > allowedRadius) {
            toast.error(`Geofence Error: You are ${Math.round(distance)}m away from the office. You must be within ${allowedRadius}m to clock in/out.`)
            setShowFaceVerification(false)
            return
          }
        }
      }
    } catch (err) {
      console.warn("Could not get geolocation", err)
    }

    if (!isIn) {
      const t = toast.loading('Recording clock in...')
      await clockIn.mutateAsync({ employeeId: employee!.id, location })
      toast.dismiss(t)
      toast.success('Clocked in!', { 
        description: `${format(new Date(), 'h:mm a')}${!isGeofenceActive ? ' • Remote clock-in allowed' : ''}` 
      })
    } else {
      const t = toast.loading('Recording clock out...')
      
      let anomalyNote = ''
      if (isGeofenceActive && location && todayAtt?.location?.clockIn && todayAtt.clock_in) {
        const clockInLoc = todayAtt.location.clockIn as { lat: number; lng: number }
        const distKm = calculateDistance(clockInLoc.lat, clockInLoc.lng, location.lat, location.lng) / 1000
        const hoursDiff = (new Date().getTime() - new Date(todayAtt.clock_in).getTime()) / 3600000
        
        if (hoursDiff > 0) {
          const speedKmh = distKm / hoursDiff
          if (speedKmh > 800) {
            anomalyNote = `⚠️ SUSPICIOUS LOCATION: Impossible travel detected (${Math.round(speedKmh)} km/h)`
          }
        }
      }

      await clockOut.mutateAsync({ employeeId: employee!.id, attendanceId: todayAtt!.id, location, notes: anomalyNote || undefined })
      toast.dismiss(t)
      toast.success('Clocked out!', { description: `${format(new Date(), 'h:mm a')}` })
    }
    refetch()
    setShowFaceVerification(false)
  }

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1])
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  }

  const handleFaceVerify = async (imageSrc: string) => {
    const faceEncoding = (employee as any).face_encoding
    if (!faceEncoding) {
      toast.error('No facial profile registered for your account.')
      return
    }

    setIsVerifying(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const blob = dataURItoBlob(imageSrc)
      const formData = new FormData()
      formData.append('file', blob, 'face.jpg')
      formData.append(
        'known_encoding',
        typeof faceEncoding === 'string' ? faceEncoding : JSON.stringify(faceEncoding)
      )

      const response = await fetch(`${apiBase}/api/verify_face`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg =
          typeof errorData.detail === 'string'
            ? errorData.detail
            : Array.isArray(errorData.detail)
              ? errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
              : 'Face verification failed'
        throw new Error(errorMsg)
      }

      const data = await response.json()
      if (data.match) {
        playSuccessSound()
        toast.success('Face verified successfully')
        executeClock()
      } else {
        playErrorSound()
        toast.error('Face verification failed', { description: 'Face does not match registered profile' })
      }
    } catch (error: any) {
      playErrorSound()
      toast.error('Verification error', { description: error.message || 'Error processing facial recognition' })
    } finally {
      setIsVerifying(false)
    }
  }

  const totalWorked = todayAtt?.total_hours
    ? `${todayAtt.total_hours}h worked`
    : isIn && todayAtt?.clock_in
      ? `Since ${format(new Date(todayAtt.clock_in), 'h:mm a')}`
      : ''

  return (
    <Card className="overflow-hidden border-border/70 shadow-xs">
      <div className="bg-gradient-to-br from-sidebar to-sidebar/80 p-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Badge
              className={`px-3 py-1 text-[11px] font-semibold gap-1.5 shadow-xs ${
                isGeofenceActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isGeofenceActive ? <ShieldCheck className="size-3 text-emerald-400" /> : <Globe className="size-3 text-amber-400" />}
              {isGeofenceActive
                ? `Geofence Enforced (${geofenceSettings?.radius || 100}m)`
                : 'Remote / Field Clock-in (Geofence OFF)'}
            </Badge>
          </div>

          <div className="text-5xl font-bold tabular-nums tracking-tight text-sidebar-foreground">
            {format(time, 'HH:mm:ss')}
          </div>
          <div className="mt-1 text-sm text-sidebar-foreground/60 mb-4">
            {format(time, 'EEEE, MMMM d, yyyy')}
          </div>

          {permissionsGranted && !isDone && (
            <div className="mx-auto max-w-sm rounded-xl overflow-hidden bg-white/5 p-2 shadow-sm border border-white/10">
              <LiveGeofenceMap userLocation={userLocation} />
            </div>
          )}

          <div className="mt-6 flex justify-center">
            {isDone ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5">
                <CheckCircle className="size-5 text-emerald-400" />
                <span className="text-sm font-medium text-sidebar-foreground">
                  Shift complete · {todayAtt?.total_hours}h
                </span>
              </div>
            ) : permissionsGranted ? (
              <Button
                size="lg"
                onClick={handleClockClick}
                disabled={clockIn.isPending || clockOut.isPending}
                className={`rounded-full px-8 ${isIn ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                <Clock className="mr-2 size-5" />
                {isIn ? 'Clock Out' : 'Clock In'}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={requestPermissions}
                disabled={checkingPermissions}
                variant="secondary"
                className="rounded-full px-8 gap-2 bg-sidebar-primary/20 text-sidebar-primary hover:bg-sidebar-primary/30 border border-sidebar-primary/30"
              >
                {checkingPermissions ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="size-4" />
                    <MapPin className="size-4" />
                  </>
                )}
                Grant Access to Clock In
              </Button>
            )}
          </div>

          {totalWorked && (
            <p className="mt-3 text-xs text-sidebar-foreground/50">{totalWorked}</p>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Clock In</p>
            <p className="mt-1 text-lg font-semibold">
              {todayAtt?.clock_in ? format(new Date(todayAtt.clock_in), 'h:mm a') : '--:--'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Clock Out</p>
            <p className="mt-1 text-lg font-semibold">
              {todayAtt?.clock_out ? format(new Date(todayAtt.clock_out), 'h:mm a') : '--:--'}
            </p>
          </div>
        </div>
      </CardContent>

      <Dialog open={showFaceVerification} onOpenChange={setShowFaceVerification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Facial Identity Verification</DialogTitle>
            <DialogDescription>
              Align your face inside the circle for AI biometric validation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <WebcamCapture onCapture={handleFaceVerify} isLoading={isVerifying} />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ================= OFFICIAL DOLE DTR DIALOG =================
function DOLEDTRDialog({
  open,
  onOpenChange,
  employee,
  records,
  monthDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  records: AttendanceRecord[]
  monthDate: Date
}) {
  if (!employee) return null

  const handlePrint = () => {
    window.print()
  }

  // Days in month
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const recordsMap = new Map<number, AttendanceRecord>()
  records.forEach(r => {
    const d = new Date(r.date).getDate()
    recordsMap.set(d, r)
  })

  let totalRegularHours = 0
  let totalOvertimeHours = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Official Daily Time Record (Civil Service Form 48 / DOLE)</DialogTitle>
          <DialogDescription>
            Official monthly attendance and timecard log for statutory auditing.
          </DialogDescription>
        </DialogHeader>

        {/* Printable DTR Layout */}
        <div className="p-6 bg-white text-black font-sans rounded-xl border print:border-none print:p-0">
          <div className="text-center space-y-1 pb-4 border-b border-black">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Civil Service Form No. 48 / DOLE Compliant</h2>
            <h1 className="text-xl font-black uppercase tracking-wider">PRIORITY HANDLING LOGISTICS, INC.</h1>
            <p className="text-sm font-bold uppercase">DAILY TIME RECORD (DTR)</p>
            <p className="text-xs font-semibold">For the Month of: {format(monthDate, 'MMMM yyyy')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-3 text-xs border-b border-black">
            <div>
              <p><span className="font-bold">NAME:</span> {employee.first_name} {employee.last_name}</p>
              <p><span className="font-bold">EMPLOYEE ID:</span> {employee.employee_id || employee.id.split('-')[0].toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">POSITION:</span> {employee.position || 'Employee'}</p>
              <p><span className="font-bold">DEPARTMENT:</span> {employee.departments?.name || 'Operations'}</p>
            </div>
          </div>

          <div className="py-2 overflow-x-auto">
            <table className="w-full text-center text-[11px] border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black">
                  <th rowSpan={2} className="border border-black p-1 w-10">Day</th>
                  <th colSpan={2} className="border border-black p-1">A.M.</th>
                  <th colSpan={2} className="border border-black p-1">P.M.</th>
                  <th colSpan={2} className="border border-black p-1">Total Hours</th>
                  <th rowSpan={2} className="border border-black p-1">Status / Remarks</th>
                </tr>
                <tr className="bg-gray-50 font-semibold border-b border-black text-[10px]">
                  <th className="border border-black p-1">Arrival</th>
                  <th className="border border-black p-1">Departure</th>
                  <th className="border border-black p-1">Arrival</th>
                  <th className="border border-black p-1">Departure</th>
                  <th className="border border-black p-1">Regular</th>
                  <th className="border border-black p-1">Overtime</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1
                  const record = recordsMap.get(dayNum)
                  const dayDate = new Date(year, month, dayNum)
                  const dayName = format(dayDate, 'EEE')
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6

                  const clockIn = record?.clock_in ? format(new Date(record.clock_in), 'h:mm a') : ''
                  const clockOut = record?.clock_out ? format(new Date(record.clock_out), 'h:mm a') : ''
                  const hours = record?.total_hours || 0
                  const ot = record?.overtime_hours || (hours > 8 ? hours - 8 : 0)
                  const reg = Math.min(8, hours)

                  if (hours > 0) {
                    totalRegularHours += reg
                    totalOvertimeHours += ot
                  }

                  return (
                    <tr key={dayNum} className={`border-b border-black/30 ${isWeekend ? 'bg-gray-50 font-semibold' : ''}`}>
                      <td className="border border-black p-0.5 font-bold">{dayNum} ({dayName})</td>
                      <td className="border border-black p-0.5">{clockIn ? clockIn : isWeekend ? '—' : ''}</td>
                      <td className="border border-black p-0.5">{hours > 0 ? '12:00 PM' : '—'}</td>
                      <td className="border border-black p-0.5">{hours > 0 ? '1:00 PM' : '—'}</td>
                      <td className="border border-black p-0.5">{clockOut ? clockOut : isWeekend ? '—' : ''}</td>
                      <td className="border border-black p-0.5 font-mono">{reg > 0 ? `${reg.toFixed(1)}h` : '—'}</td>
                      <td className="border border-black p-0.5 font-mono">{ot > 0 ? `${ot.toFixed(1)}h` : '—'}</td>
                      <td className="border border-black p-0.5 text-[10px]">
                        {record ? record.status.toUpperCase() : isWeekend ? 'OFF' : 'ABSENT'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-black text-xs">
                  <td colSpan={5} className="border border-black p-1 text-right">TOTAL HOURS FOR THE MONTH:</td>
                  <td className="border border-black p-1 font-mono">{totalRegularHours.toFixed(1)}h</td>
                  <td className="border border-black p-1 font-mono">{totalOvertimeHours.toFixed(1)}h</td>
                  <td className="border border-black p-1 font-mono font-bold">{(totalRegularHours + totalOvertimeHours).toFixed(1)}h</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="border-t border-black pt-2">
              <p className="font-bold">{employee.first_name} {employee.last_name}</p>
              <p className="text-[10px] text-gray-600">Employee Signature</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold">Authorized HR / Operations Supervisor</p>
              <p className="text-[10px] text-gray-600">Verified & Approved</p>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4" /> Print Form 48 DTR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ================= MAIN ATTENDANCE PAGE =================
export default function AttendancePage() {
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  
  // Geofence settings state
  const [geofenceSettings, setGeofenceSettings] = useState<GeofenceState | null>(null)
  const [togglingGeofence, setTogglingGeofence] = useState(false)

  // Manual Attendance Record Modal State
  const [manualRecordOpen, setManualRecordOpen] = useState(false)
  const [manualForm, setManualForm] = useState({
    id: '',
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    clock_in_time: '08:00',
    clock_out_time: '17:00',
    status: 'present',
    notes: '',
  })

  // DTR Dialog State
  const [dtrEmployee, setDtrEmployee] = useState<Employee | null>(null)

  // Delete Attendance State
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)

  const { data: employees } = useEmployees()
  const { data: departments } = useDepartments()
  const { data: todayAttendance, isLoading } = useAttendance(selectedDate)
  
  const { data: monthAttendance } = useAttendanceRange(
    format(startOfMonth(calendarMonth), 'yyyy-MM-dd'),
    format(endOfMonth(calendarMonth), 'yyyy-MM-dd')
  )

  const manualMutation = useManualAttendanceRecord()
  const deleteMutation = useDeleteAttendanceRecord()

  // Fetch geofence configuration
  useEffect(() => {
    const fetchGeofence = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('geofence_settings')
          .eq('id', ORG_ID)
          .maybeSingle()

        if (error) throw error
        if (data?.geofence_settings) {
          const s = data.geofence_settings as any
          setGeofenceSettings({
            lat: s.lat ?? 14.5995,
            lng: s.lng ?? 120.9842,
            radius: s.radius ?? 100,
            enabled: s.enabled !== false,
          })
        } else {
          setGeofenceSettings({
            lat: 14.5995,
            lng: 120.9842,
            radius: 100,
            enabled: true,
          })
        }
      } catch (err) {
        console.warn('Error loading geofence settings:', err)
      }
    }
    fetchGeofence()
  }, [])

  // HR Manager / Admin toggle geofence enforcement
  const handleToggleGeofence = async (newEnabled: boolean) => {
    setTogglingGeofence(true)
    try {
      const current = geofenceSettings || { lat: 14.5995, lng: 120.9842, radius: 100, enabled: true }
      const updated = { ...current, enabled: newEnabled }

      const { error } = await supabase
        .from('organizations')
        .update({ geofence_settings: updated })
        .eq('id', ORG_ID)

      if (error) throw error
      setGeofenceSettings(updated)

      if (newEnabled) {
        toast.success('🛡️ Geofence Enforcement Enabled', {
          description: `Employees must be within ${updated.radius}m of the hub to clock in.`
        })
      } else {
        toast.info('🌐 Geofence Enforcement Disabled', {
          description: 'Employees can now clock in from any remote or field location.'
        })
      }
    } catch (err: any) {
      toast.error('Failed to update geofence: ' + err.message)
    } finally {
      setTogglingGeofence(false)
    }
  }

  const isGeofenceActive = geofenceSettings?.enabled !== false

  // Open Manual Entry
  const openManualCreate = () => {
    setManualForm({
      id: '',
      employee_id: employees?.[0]?.id || '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      clock_in_time: '08:00',
      clock_out_time: '17:00',
      status: 'present',
      notes: '',
    })
    setManualRecordOpen(true)
  }

  const openManualEdit = (record: AttendanceRecord) => {
    const inTime = record.clock_in ? format(new Date(record.clock_in), 'HH:mm') : '08:00'
    const outTime = record.clock_out ? format(new Date(record.clock_out), 'HH:mm') : '17:00'

    setManualForm({
      id: record.id,
      employee_id: record.employee_id,
      date: record.date,
      clock_in_time: inTime,
      clock_out_time: outTime,
      status: record.status,
      notes: record.notes || '',
    })
    setManualRecordOpen(true)
  }

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.employee_id) {
      toast.error('Please select an employee')
      return
    }

    try {
      const clockInISO = manualForm.clock_in_time 
        ? `${manualForm.date}T${manualForm.clock_in_time}:00` 
        : null
      const clockOutISO = manualForm.clock_out_time 
        ? `${manualForm.date}T${manualForm.clock_out_time}:00` 
        : null

      let totalHours = 0
      if (clockInISO && clockOutISO) {
        const diff = new Date(clockOutISO).getTime() - new Date(clockInISO).getTime()
        totalHours = Math.max(0, parseFloat((diff / 3600000 - 1).toFixed(2)))
      }

      await manualMutation.mutateAsync({
        id: manualForm.id || undefined,
        employee_id: manualForm.employee_id,
        date: manualForm.date,
        clock_in: clockInISO,
        clock_out: clockOutISO,
        total_hours: totalHours,
        overtime_hours: Math.max(0, totalHours - 8),
        status: manualForm.status,
        notes: manualForm.notes || null,
      })

      toast.success(manualForm.id ? 'Attendance record updated!' : 'Manual attendance logged!')
      setManualRecordOpen(false)
    } catch (err: any) {
      toast.error('Failed to save attendance record: ' + err.message)
    }
  }

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return
    try {
      await deleteMutation.mutateAsync(deleteRecordId)
      toast.success('Attendance record deleted')
      setDeleteRecordId(null)
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message)
    }
  }

  // Summary Metrics
  const summary = useMemo(() => {
    if (!todayAttendance) return { present: 0, late: 0, absent: 0, missingClockOut: 0, total: 0 }
    return {
      present: todayAttendance.filter(a => a.status === 'present').length,
      late: todayAttendance.filter(a => a.status === 'late').length,
      absent: todayAttendance.filter(a => a.status === 'absent').length,
      missingClockOut: todayAttendance.filter(a => a.clock_in && !a.clock_out).length,
      total: todayAttendance.length,
    }
  }, [todayAttendance])

  // Filtered attendance records
  const filteredAttendance = useMemo(() => {
    if (!todayAttendance) return []
    return todayAttendance.filter(a => {
      const empName = `${a.employees?.first_name || ''} ${a.employees?.last_name || ''}`.toLowerCase()
      const matchSearch = !search || empName.includes(search.toLowerCase())
      
      const matchStatus = !statusFilter || (
        statusFilter === 'missing_out' ? (a.clock_in && !a.clock_out) : a.status === statusFilter
      )

      const deptName = a.employees?.departments?.name || ''
      const matchDept = deptFilter === 'all' || deptName.toLowerCase() === deptFilter.toLowerCase()

      return matchSearch && matchStatus && matchDept
    })
  }, [todayAttendance, statusFilter, deptFilter, search])

  // Monthly Aggregation
  const monthlySummary = useMemo(() => {
    if (!monthAttendance) return []
    const summaryMap = new Map<string, { employee: any, present: number, late: number, absent: number, half_day: number, totalHours: number, records: AttendanceRecord[] }>()
    
    monthAttendance.forEach(record => {
      const empId = record.employee_id
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employee: record.employees,
          present: 0,
          late: 0,
          absent: 0,
          half_day: 0,
          totalHours: 0,
          records: [],
        })
      }
      const stats = summaryMap.get(empId)!
      stats.records.push(record)
      if (record.status === 'present') stats.present++
      if (record.status === 'late') stats.late++
      if (record.status === 'absent') stats.absent++
      if (record.status === 'half_day') stats.half_day++
      if (record.total_hours) stats.totalHours += record.total_hours
    })
  
    return Array.from(summaryMap.values()).sort((a, b) => {
      const nameA = a.employee?.first_name || ''
      const nameB = b.employee?.first_name || ''
      return nameA.localeCompare(nameB)
    })
  }, [monthAttendance])

  return (
    <div className="space-y-6">
      {/* Official DOLE DTR Dialog */}
      <DOLEDTRDialog
        open={!!dtrEmployee}
        onOpenChange={(op) => !op && setDtrEmployee(null)}
        employee={dtrEmployee}
        records={monthAttendance?.filter(r => r.employee_id === dtrEmployee?.id) || []}
        monthDate={calendarMonth}
      />

      {/* Top Header & HR Attendance Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance & Timekeeping Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time biometric timecards, GPS spatial bounds, and DOLE Form 48 Daily Time Records
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Geofence Switch */}
          {can.manageAttendance() && (
            <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all ${
              isGeofenceActive 
                ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60' 
                : 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60'
            }`}>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Geofence Lock</span>
                <span className={`text-xs font-semibold ${isGeofenceActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {isGeofenceActive ? 'Active (Strict)' : 'Bypassed (Remote)'}
                </span>
              </div>
              <Switch
                id="hr-geofence-toggle"
                checked={isGeofenceActive}
                onCheckedChange={handleToggleGeofence}
                disabled={togglingGeofence}
                title="Toggle Geofence on/off to allow or restrict remote clock-ins"
              />
            </div>
          )}

          {can.manageAttendance() && (
            <Button variant="outline" className="gap-1.5" onClick={openManualCreate}>
              <PlusCircle className="size-4" />
              Manual Timecard
            </Button>
          )}

          {can.manageAttendance() && (
            <Button 
              variant="outline" 
              className="gap-1.5"
              onClick={() => {
                if (!todayAttendance || todayAttendance.length === 0) {
                  toast.error('No records to export')
                  return
                }
                const exportData = todayAttendance.map(record => ({
                  Date: record.date,
                  Employee: `${record.employees?.first_name} ${record.employees?.last_name}`,
                  Department: record.employees?.departments?.name || 'Operations',
                  Status: record.status.toUpperCase(),
                  'Clock In': record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '',
                  'Clock Out': record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '',
                  'Total Hours': record.total_hours || 0,
                  'Overtime Hours': record.overtime_hours || 0,
                  Notes: record.notes || '',
                }))
                downloadCSV(exportData, `Attendance_Log_${format(selectedDate, 'yyyy-MM-dd')}`)
                toast.success('Attendance report exported to CSV')
              }}
            >
              <Download className="size-4" />
              Export Today
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Clock In Widget + Today's Summary & Roster */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clock widget */}
        <ClockWidget geofenceSettings={geofenceSettings} />

        {/* Today's summary & Roster */}
        <Card className="lg:col-span-2 border-border/70 shadow-xs flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {isSameDay(selectedDate, new Date()) ? "Today's Verified Attendance" : "Daily Attendance Roster"}
                </CardTitle>
                <CardDescription>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums font-semibold">
                  {summary.total} Tracked Records
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            {/* KPI Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Present', id: 'present', value: summary.present, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-500' },
                { label: 'Late / Tardy', id: 'late', value: summary.late, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30 ring-amber-500' },
                { label: 'Absent', id: 'absent', value: summary.absent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30 ring-red-500' },
                { 
                  label: 'Missing Clock-Out', 
                  id: 'missing_out', 
                  value: summary.missingClockOut, 
                  color: summary.missingClockOut > 0 ? 'text-rose-600' : 'text-muted-foreground',
                  bg: summary.missingClockOut > 0 ? 'bg-rose-50 dark:bg-rose-950/40 ring-rose-500' : 'bg-muted/40'
                },
              ].map((s) => (
                <div 
                  key={s.label} 
                  onClick={() => setStatusFilter(statusFilter === s.id ? null : s.id)}
                  className={`rounded-xl p-3 text-center cursor-pointer transition-all hover:ring-2 ${statusFilter === s.id ? 'ring-2 shadow-xs' : ''} ${s.bg}`}
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Search & Department Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Building2 className="mr-1 size-3 text-muted-foreground" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Live Attendance List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              ) : filteredAttendance.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                  <Clock className="size-8 mx-auto text-muted-foreground/40 mb-1.5" />
                  <p className="text-sm font-semibold">No attendance records logged for this filter</p>
                  <p className="text-xs">Adjust the filter pills or create a manual entry.</p>
                </div>
              ) : (
                filteredAttendance.map((record) => {
                  const cfg = ATT_STATUS_CONFIG[record.status] || ATT_STATUS_CONFIG.present
                  const Icon = cfg.icon

                  return (
                    <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 shrink-0 ring-1 ring-border">
                          {record.employees?.avatar_url && <AvatarImage src={record.employees.avatar_url} className="object-cover" />}
                          <AvatarFallback className="bg-primary/10 text-xs text-primary font-bold">
                            {`${record.employees?.first_name?.[0] ?? ''}${record.employees?.last_name?.[0] ?? ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                            {record.employees?.first_name} {record.employees?.last_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {record.employees?.position || 'Staff'} • {record.employees?.departments?.name || 'Operations'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="text-right hidden sm:block">
                          <p className="font-semibold text-foreground">
                            {record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '—'}
                            {record.clock_out ? ` → ${format(new Date(record.clock_out), 'h:mm a')}` : ' (On Duty)'}
                          </p>
                          {record.total_hours ? (
                            <p className="text-[10px] text-muted-foreground font-mono">{record.total_hours}h paid</p>
                          ) : null}
                        </div>

                        <Badge className={`text-[10px] font-semibold ${cfg.className}`}>
                          <Icon className="mr-1 size-3" />
                          {cfg.label}
                        </Badge>

                        {record.location && (
                          <LocationMapDialog
                            clockInLocation={(record.location as any)?.clockIn}
                            clockOutLocation={(record.location as any)?.clockOut}
                          />
                        )}

                        {can.manageAttendance() && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openManualEdit(record)}>
                                <Edit2 className="mr-2 size-3.5" /> Edit Timecard
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteRecordId(record.id)}>
                                <Trash2 className="mr-2 size-3.5" /> Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & History Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-muted/70">
          <TabsTrigger value="history">Attendance History Calendar</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Master DTR Aggregation</TabsTrigger>
          {can.manageAttendance() && <TabsTrigger value="map">Field Personnel Live Map</TabsTrigger>}
        </TabsList>

        {/* TAB 1: ATTENDANCE HISTORY CALENDAR */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Historical Attendance Calendar</CardTitle>
              <CardDescription>Select any date on the calendar to view verified logs and timecard entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="rounded-md border p-3 flex justify-center bg-card shadow-xs">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    className="rounded-md"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-semibold text-sm">
                      Logs for {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium">
                      {filteredAttendance.length} records
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {filteredAttendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-12 text-center">
                        No logs recorded for this date.
                      </p>
                    ) : (
                      filteredAttendance.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-xs hover:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              {record.employees?.avatar_url && <AvatarImage src={record.employees.avatar_url} />}
                              <AvatarFallback>{record.employees?.first_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{record.employees?.first_name} {record.employees?.last_name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                In: {record.clock_in ? format(new Date(record.clock_in), 'hh:mm a') : 'N/A'} • Out: {record.clock_out ? format(new Date(record.clock_out), 'hh:mm a') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={ATT_STATUS_CONFIG[record.status]?.className || ''}>
                              {ATT_STATUS_CONFIG[record.status]?.label || record.status}
                            </Badge>
                            {record.location && (
                              <LocationMapDialog
                                clockInLocation={(record.location as any)?.clockIn}
                                clockOutLocation={(record.location as any)?.clockOut}
                              />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MONTHLY DTR AGGREGATION */}
        <TabsContent value="monthly" className="space-y-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Monthly Master DTR Aggregation</CardTitle>
                  <CardDescription>Consolidated timecards and DOLE Form 48 generators for {format(calendarMonth, 'MMMM yyyy')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(subDays(startOfMonth(calendarMonth), 1))}>
                    Previous Month
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date())}>
                    Current Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/30">
                      <th className="py-3 px-3">Employee</th>
                      <th className="py-3 px-3 text-center">Present</th>
                      <th className="py-3 px-3 text-center">Late / Tardy</th>
                      <th className="py-3 px-3 text-center">Half Day</th>
                      <th className="py-3 px-3 text-center">Absent</th>
                      <th className="py-3 px-3 text-center">Total Paid Hours</th>
                      <th className="py-3 px-3 text-right">Official DTR Form 48</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No monthly records available for this period.
                        </td>
                      </tr>
                    ) : (
                      monthlySummary.map(item => (
                        <tr key={item.employee?.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-2.5 font-medium">
                            <Avatar className="size-7">
                              {item.employee?.avatar_url && <AvatarImage src={item.employee.avatar_url} />}
                              <AvatarFallback className="text-[10px]">{item.employee?.first_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground text-xs">{item.employee?.first_name} {item.employee?.last_name}</p>
                              <p className="text-[10px] text-muted-foreground">{item.employee?.departments?.name || 'Operations'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-600 font-semibold">{item.present}</td>
                          <td className="py-3 px-3 text-center text-amber-600 font-semibold">{item.late}</td>
                          <td className="py-3 px-3 text-center text-purple-600 font-semibold">{item.half_day}</td>
                          <td className="py-3 px-3 text-center text-red-600 font-semibold">{item.absent}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-foreground">{item.totalHours.toFixed(1)}h</td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => setDtrEmployee(item.employee)}
                            >
                              <Printer className="size-3.5" />
                              Generate DTR
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: FIELD PERSONNEL LIVE MAP */}
        {can.manageAttendance() && (
          <TabsContent value="map" className="space-y-4">
            <Card className="border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">Field Personnel Logistics GPS Map</CardTitle>
                <CardDescription>Spatial distribution of clocked-in logistics drivers, couriers, and dispatchers</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyAttendanceMap records={todayAttendance || []} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* MANUAL ATTENDANCE ENTRY / OVERRIDE DIALOG */}
      <Dialog open={manualRecordOpen} onOpenChange={setManualRecordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{manualForm.id ? 'Edit Attendance Record' : 'Manual Timecard Entry'}</DialogTitle>
            <DialogDescription>
              Log or override timecard logs for official business, forgotten clock-ins, or excused shifts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveManualRecord} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Employee *</Label>
              <Select
                value={manualForm.employee_id}
                onValueChange={v => setManualForm(p => ({ ...p, employee_id: v }))}
                disabled={!!manualForm.id}
              >
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.departments?.name || 'Operations'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={manualForm.date}
                onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Clock In Time</Label>
                <Input
                  type="time"
                  value={manualForm.clock_in_time}
                  onChange={e => setManualForm(p => ({ ...p, clock_in_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Clock Out Time</Label>
                <Input
                  type="time"
                  value={manualForm.clock_out_time}
                  onChange={e => setManualForm(p => ({ ...p, clock_out_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Attendance Status</Label>
              <Select value={manualForm.status} onValueChange={v => setManualForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late / Tardy</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="ob">Official Business (OB)</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Audit Justification / Notes</Label>
              <Input
                value={manualForm.notes}
                onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Field dispatch OB slip #1043"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setManualRecordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={manualMutation.isPending}>
                {manualMutation.isPending ? 'Saving...' : 'Save Timecard'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={open => !open && setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance log? This action cannot be undone and will remove the corresponding timecard entry from payroll computation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
