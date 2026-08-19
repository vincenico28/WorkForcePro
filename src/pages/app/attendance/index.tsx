import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import {
  Clock, CheckCircle, XCircle, AlertCircle, TimerReset, MapPin, Download,
  Loader2, Camera, ShieldCheck, ShieldAlert, Globe, SwitchCamera, Sliders
} from 'lucide-react'
import { useAttendance, useAttendanceRange, useClockIn, useClockOut, useTodayAttendance } from '@/hooks/use-attendance'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { WebcamCapture } from '@/components/face-recognition/WebcamCapture'
import { LocationMapDialog } from '@/components/attendance/LocationMapDialog'
import { DailyAttendanceMap } from '@/components/attendance/DailyAttendanceMap'
import { LiveGeofenceMap } from '@/components/attendance/LiveGeofenceMap'
import { playSuccessSound, playErrorSound } from '@/utils/audio'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { downloadCSV } from '@/utils/export'
import { calculateDistance } from '@/utils/geo'
import { supabase, ORG_ID } from '@/lib/supabase'

const ATT_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  present: { label: 'Present', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle },
  late: { label: 'Late', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: AlertCircle },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: XCircle },
  holiday: { label: 'Holiday', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', icon: CheckCircle },
  half_day: { label: 'Half Day', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400', icon: AlertCircle },
}

interface GeofenceState {
  lat: number
  lng: number
  radius: number
  enabled: boolean
}

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

  // Track user location when permissions are granted
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

  // Silently check if permissions are already granted on mount
  useEffect(() => {
    const checkSilent = async () => {
      try {
        const geoStatus = await navigator.permissions.query({ name: 'geolocation' })
        // @ts-ignore - 'camera' is valid in many browsers but might not be in TS standard types
        const camStatus = await navigator.permissions.query({ name: 'camera' })
        
        if (geoStatus.state === 'granted' && camStatus.state === 'granted') {
          setPermissionsGranted(true)
        }
      } catch (e) {
        // Ignore errors if browser doesn't support the permissions API fully
      }
    }
    checkSilent()
  }, [])

  const requestPermissions = async () => {
    setCheckingPermissions(true)
    try {
      // 1. Request Camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Stop tracks immediately since we just wanted to grant the permission
      stream.getTracks().forEach(track => track.stop())

      // 2. Request Geolocation (Exact Location)
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
      console.error(err)
      toast.error('Permissions required', { description: 'You must allow camera and exact location access to use the attendance system.' })
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
    let location: { lat: number; lng: number } | undefined;
    
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        // Strict GPS Validation if geofence is enabled
        if (isGeofenceActive && position.coords.accuracy > 60) {
          toast.error(`GPS Error`, { description: `Signal is too weak (Accuracy: ${Math.round(position.coords.accuracy)}m). Please step outside or near a window for a valid GPS lock.` })
          setShowFaceVerification(false)
          return
        }
        
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
        
        // Geofencing verification
        const { data: org } = await supabase
          .from('organizations')
          .select('geofence_settings')
          .eq('id', ORG_ID)
          .single();
          
        let officeLat = import.meta.env.VITE_OFFICE_LAT ? parseFloat(import.meta.env.VITE_OFFICE_LAT) : 14.5995;
        let officeLng = import.meta.env.VITE_OFFICE_LNG ? parseFloat(import.meta.env.VITE_OFFICE_LNG) : 120.9842;
        let allowedRadius = import.meta.env.VITE_ALLOWED_RADIUS_METERS ? parseInt(import.meta.env.VITE_ALLOWED_RADIUS_METERS) : 100;
        let isEnabled = true;

        if (org?.geofence_settings) {
          const settings = org.geofence_settings as { lat: number; lng: number; radius: number; enabled?: boolean };
          officeLat = settings.lat ?? officeLat;
          officeLng = settings.lng ?? officeLng;
          allowedRadius = settings.radius ?? allowedRadius;
          if (settings.enabled !== undefined) {
            isEnabled = settings.enabled;
          }
        }

        // ONLY enforce distance restrictions if Geofence is Enabled (ON)
        if (isEnabled && officeLat !== null && officeLng !== null && !isNaN(officeLat) && !isNaN(officeLng)) {
          const distance = calculateDistance(location.lat, location.lng, officeLat, officeLng);
          if (distance > allowedRadius) {
            toast.error(`Geofence Error: You are ${Math.round(distance)}m away from the office. You must be within ${allowedRadius}m to clock in/out.`);
            setShowFaceVerification(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Could not get geolocation", err);
    }

    if (!isIn) {
      const t = toast.loading('Clocking in...')
      await clockIn.mutateAsync({ employeeId: employee!.id, location })
      toast.dismiss(t)
      toast.success('Clocked in!', { 
        description: `${format(new Date(), 'h:mm a')}${!isGeofenceActive ? ' • Remote location allowed' : ''}` 
      })
    } else {
      const t = toast.loading('Clocking out...')
      
      // Impossible Travel Detection (only evaluated if strict GPS is active)
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
          {/* Geofence Status Indicator Pill */}
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
                : 'Remote / Flexible Clock-in (Geofence OFF)'}
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

export default function AttendancePage() {
  const { employee } = useAuthStore()
  const { can } = usePermissions()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  
  // Geofence settings state
  const [geofenceSettings, setGeofenceSettings] = useState<GeofenceState | null>(null)
  const [togglingGeofence, setTogglingGeofence] = useState(false)

  const { data: todayAttendance, isLoading } = useAttendance(selectedDate)
  
  const { data: monthAttendance } = useAttendanceRange(
    format(startOfMonth(calendarMonth), 'yyyy-MM-dd'),
    format(endOfMonth(calendarMonth), 'yyyy-MM-dd')
  )

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
            enabled: s.enabled !== false, // default true
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
          description: `Employees must be within ${updated.radius}m of the office hub to clock in.`
        })
      } else {
        toast.info('🌐 Geofence Enforcement Disabled', {
          description: 'Employees can now clock in from any remote or field location without distance blocks.'
        })
      }
    } catch (err: any) {
      toast.error('Failed to update geofence status: ' + err.message)
    } finally {
      setTogglingGeofence(false)
    }
  }

  const isGeofenceActive = geofenceSettings?.enabled !== false

  const summary = useMemo(() => {
    if (!todayAttendance) return { present: 0, late: 0, absent: 0, total: 0 }
    return {
      present: todayAttendance.filter(a => a.status === 'present').length,
      late: todayAttendance.filter(a => a.status === 'late').length,
      absent: todayAttendance.filter(a => a.status === 'absent').length,
      total: todayAttendance.length,
    }
  }, [todayAttendance])

  const filteredAttendance = useMemo(() => {
    if (!todayAttendance) return []
    if (!statusFilter) return todayAttendance
    return todayAttendance.filter(a => a.status === statusFilter)
  }, [todayAttendance, statusFilter])

  const monthlySummary = useMemo(() => {
    if (!monthAttendance) return []
    const summaryMap = new Map<string, { employee: any, present: number, late: number, absent: number, half_day: number }>()
    
    monthAttendance.forEach(record => {
      const empId = record.employee_id
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employee: record.employees,
          present: 0,
          late: 0,
          absent: 0,
          half_day: 0,
        })
      }
      const stats = summaryMap.get(empId)!
      if (record.status === 'present') stats.present++
      if (record.status === 'late') stats.late++
      if (record.status === 'absent') stats.absent++
      if (record.status === 'half_day') stats.half_day++
    })
  
    return Array.from(summaryMap.values()).sort((a, b) => {
      const nameA = a.employee?.first_name || ''
      const nameB = b.employee?.first_name || ''
      return nameA.localeCompare(nameB)
    })
  }, [monthAttendance])

  return (
    <div className="space-y-6">
      {/* Top Header & HR Geofence Quick Controller */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Verify real-time attendance, biometric clock-ins, and GPS spatial locks
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* HR Manager Geofence Enforcement Switch */}
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
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={() => {
                if (!monthAttendance || monthAttendance.length === 0) {
                  toast.error('No records to export')
                  return
                }
                const exportData = monthAttendance.map(record => ({
                  Date: record.date,
                  Employee: `${record.employees?.first_name} ${record.employees?.last_name}`,
                  Status: record.status,
                  'Clock In': record.clock_in ? format(new Date(record.clock_in), 'h:mm a') : '',
                  'Clock Out': record.clock_out ? format(new Date(record.clock_out), 'h:mm a') : '',
                  'Total Hours': record.total_hours || 0
                }))
                downloadCSV(exportData, `Attendance_Report_${format(calendarMonth, 'MMM_yyyy')}`)
                toast.success('Report downloaded successfully')
              }}
            >
              <Download className="size-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clock widget */}
        <ClockWidget geofenceSettings={geofenceSettings} />

        {/* Today's summary */}
        <Card className="lg:col-span-2 border-border/70 shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{isSameDay(selectedDate, new Date()) ? "Today's Summary" : "Daily Summary"}</CardTitle>
                <CardDescription>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">{summary.total} tracked</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Present', id: 'present', value: summary.present, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-500' },
                { label: 'Late', id: 'late', value: summary.late, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30 ring-amber-500' },
                { label: 'Absent', id: 'absent', value: summary.absent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30 ring-red-500' },
              ].map((s) => (
                <div 
                  key={s.label} 
                  onClick={() => setStatusFilter(statusFilter === s.id ? null : s.id)}
                  className={`rounded-xl p-3 text-center cursor-pointer transition-all hover:ring-2 ${statusFilter === s.id ? 'ring-2 shadow-sm' : ''} ${s.bg}`}
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : filteredAttendance?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {statusFilter ? `No ${statusFilter} records for today` : 'No attendance records for today'}
                </p>
              ) : (
                filteredAttendance?.map((record) => {
                  const cfg = ATT_STATUS_CONFIG[record.status]
                  const Icon = cfg?.icon ?? Clock
                  return (
                    <div key={record.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <Avatar className="size-9 shrink-0">
                        {record.employees?.avatar_url && <AvatarImage src={record.employees.avatar_url} className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {`${record.employees?.first_name?.[0] ?? ''}${record.employees?.last_name?.[0] ?? ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {record.employees?.first_name} {record.employees?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.employees?.position}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {record.clock_in && (
                          <span className="text-muted-foreground">
                            {format(new Date(record.clock_in), 'h:mm a')}
                          </span>
                        )}
                        {record.clock_out && (
                          <span className="text-muted-foreground">
                            → {format(new Date(record.clock_out), 'h:mm a')}
                          </span>
                        )}
                        <Badge className={cfg?.className ?? ''}>
                          <Icon className="mr-1 size-3" />
                          {cfg?.label ?? record.status}
                        </Badge>
                        {record.location && (
                          <LocationMapDialog
                            clockInLocation={(record.location as any)?.clockIn}
                            clockOutLocation={(record.location as any)?.clockOut}
                          />
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
        <TabsList>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          {can.manageAttendance() && <TabsTrigger value="map">Live Field Map</TabsTrigger>}
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Historical Logs</CardTitle>
              <CardDescription>Select a date to view past attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="rounded-md border p-3 flex justify-center bg-card">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    className="rounded-md"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-sm">
                    Logs for {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {filteredAttendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No logs recorded for this date.
                      </p>
                    ) : (
                      filteredAttendance.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-border text-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              {record.employees?.avatar_url && <AvatarImage src={record.employees.avatar_url} />}
                              <AvatarFallback>{record.employees?.first_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{record.employees?.first_name} {record.employees?.last_name}</p>
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

        <TabsContent value="monthly" className="space-y-4">
          <Card className="border-border/70 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Monthly Aggregation</CardTitle>
                  <CardDescription>Aggregated metrics for {format(calendarMonth, 'MMMM yyyy')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(subDays(startOfMonth(calendarMonth), 1))}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date())}>
                    Current
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                      <th className="py-2.5">Employee</th>
                      <th className="py-2.5 text-center">Present</th>
                      <th className="py-2.5 text-center">Late</th>
                      <th className="py-2.5 text-center">Half Day</th>
                      <th className="py-2.5 text-center">Absent</th>
                      <th className="py-2.5 text-right">Total Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No monthly records available
                        </td>
                      </tr>
                    ) : (
                      monthlySummary.map(item => (
                        <tr key={item.employee?.id} className="hover:bg-muted/50">
                          <td className="py-3 flex items-center gap-2 font-medium">
                            <Avatar className="size-6">
                              {item.employee?.avatar_url && <AvatarImage src={item.employee.avatar_url} />}
                              <AvatarFallback className="text-[10px]">{item.employee?.first_name?.[0]}</AvatarFallback>
                            </Avatar>
                            {item.employee?.first_name} {item.employee?.last_name}
                          </td>
                          <td className="py-3 text-center text-emerald-600 font-semibold">{item.present}</td>
                          <td className="py-3 text-center text-amber-600 font-semibold">{item.late}</td>
                          <td className="py-3 text-center text-purple-600 font-semibold">{item.half_day}</td>
                          <td className="py-3 text-center text-red-600 font-semibold">{item.absent}</td>
                          <td className="py-3 text-right font-bold">{item.present + item.late + item.half_day}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {can.manageAttendance() && (
          <TabsContent value="map" className="space-y-4">
            <Card className="border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base">Field Personnel Live Map</CardTitle>
                <CardDescription>Visual distribution of on-the-clock personnel across logistics coordinates</CardDescription>
              </CardHeader>
              <CardContent>
                <DailyAttendanceMap records={todayAttendance || []} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
