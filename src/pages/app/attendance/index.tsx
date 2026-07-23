import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, subDays } from 'date-fns'
import { Clock, CheckCircle, XCircle, AlertCircle, TimerReset, MapPin, Download } from 'lucide-react'
import { useAttendance, useAttendanceRange, useClockIn, useClockOut, useTodayAttendance } from '@/hooks/use-attendance'
import { useAuthStore } from '@/stores/auth.store'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { WebcamCapture } from '@/components/face-recognition/WebcamCapture'
import { LocationMapDialog } from '@/components/attendance/LocationMapDialog'
import { DailyAttendanceMap } from '@/components/attendance/DailyAttendanceMap'
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

function ClockWidget() {
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
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
        
        // Geofencing verification
        const { data: org } = await supabase
          .from('organizations')
          .select('geofence_settings')
          .eq('id', ORG_ID)
          .single();
          
        let officeLat = import.meta.env.VITE_OFFICE_LAT ? parseFloat(import.meta.env.VITE_OFFICE_LAT) : null;
        let officeLng = import.meta.env.VITE_OFFICE_LNG ? parseFloat(import.meta.env.VITE_OFFICE_LNG) : null;
        let allowedRadius = import.meta.env.VITE_ALLOWED_RADIUS_METERS ? parseInt(import.meta.env.VITE_ALLOWED_RADIUS_METERS) : 100;

        if (org?.geofence_settings) {
          const settings = org.geofence_settings as { lat: number; lng: number; radius: number };
          officeLat = settings.lat;
          officeLng = settings.lng;
          allowedRadius = settings.radius;
        }

        if (officeLat !== null && officeLng !== null && !isNaN(officeLat) && !isNaN(officeLng)) {
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
      toast.success('Clocked in!', { description: `${format(new Date(), 'h:mm a')}` })
    } else {
      const t = toast.loading('Clocking out...')
      await clockOut.mutateAsync({ employeeId: employee!.id, attendanceId: todayAtt!.id, location })
      toast.dismiss(t)
      toast.success('Clocked out!', { description: `${format(new Date(), 'h:mm a')}` })
    }
    refetch()
    setShowFaceVerification(false)
  }

  const handleFaceVerify = async (imageSrc: string) => {
    const faceEncoding = (employee as any).face_encoding
    if (!faceEncoding) return
    
    setIsVerifying(true)
    const byteString = atob(imageSrc.split(',')[1])
    const mimeString = imageSrc.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
    const blob = new Blob([ab], { type: mimeString })

    const formData = new FormData()
    formData.append('file', blob, 'verify.jpg')
    formData.append('known_encoding', JSON.stringify(faceEncoding))

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE}/api/verify_face`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Verification failed')
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
      toast.error('Verification error', { description: error.message })
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
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-sidebar to-sidebar/80 p-6">
        <div className="text-center">
          <div className="text-5xl font-bold tabular-nums tracking-tight text-sidebar-foreground">
            {format(time, 'HH:mm:ss')}
          </div>
          <div className="mt-1 text-sm text-sidebar-foreground/60">
            {format(time, 'EEEE, MMMM d, yyyy')}
          </div>

          <div className="mt-6 flex justify-center">
            {isDone ? (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5">
                <CheckCircle className="size-5 text-emerald-400" />
                <span className="text-sm font-medium text-sidebar-foreground">
                  Shift complete · {todayAtt?.total_hours}h
                </span>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleClockClick}
                disabled={clockIn.isPending || clockOut.isPending}
                className={`rounded-full px-8 ${isIn ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
              >
                <Clock className="mr-2 size-5" />
                {isIn ? 'Clock Out' : 'Clock In'}
              </Button>
            )}
          </div>

          {totalWorked && (
            <p className="mt-3 text-xs text-sidebar-foreground/50">{totalWorked}</p>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <p className="font-semibold">{todayAtt?.clock_in ? format(new Date(todayAtt.clock_in), 'h:mm a') : '--:--'}</p>
            <p className="text-xs text-muted-foreground">Clock In</p>
          </div>
          <div>
            <p className="font-semibold">{todayAtt?.clock_out ? format(new Date(todayAtt.clock_out), 'h:mm a') : '--:--'}</p>
            <p className="text-xs text-muted-foreground">Clock Out</p>
          </div>
          <div>
            <p className="font-semibold">{todayAtt?.total_hours ? `${todayAtt.total_hours}h` : '0h'}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          <span>Office · GPS Verified</span>
        </div>
      </CardContent>
      <Dialog open={showFaceVerification} onOpenChange={setShowFaceVerification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Face ID Verification</DialogTitle>
            <DialogDescription>
              Please verify your identity to {isIn ? 'clock out' : 'clock in'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <WebcamCapture onCapture={handleFaceVerify} isLoading={isVerifying} />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default function AttendancePage() {
  const { can } = usePermissions()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const { data: todayAttendance, isLoading } = useAttendance(selectedDate)

  const endDate = format(endOfMonth(calendarMonth), 'yyyy-MM-dd')
  const startDate = format(startOfMonth(calendarMonth), 'yyyy-MM-dd')
  const { data: monthAttendance } = useAttendanceRange(startDate, endDate)

  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const summary = {
    present: todayAttendance?.filter(a => a.status === 'present').length ?? 0,
    late: todayAttendance?.filter(a => a.status === 'late').length ?? 0,
    absent: todayAttendance?.filter(a => a.status === 'absent').length ?? 0,
    total: todayAttendance?.length ?? 0,
  }

  const filteredAttendance = todayAttendance?.filter(a => !statusFilter || a.status === statusFilter)

  const monthlySummary = useMemo(() => {
    if (!monthAttendance) return []
    const summaryMap = new Map<string, any>()
    
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
      const stats = summaryMap.get(empId)
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track and manage employee attendance</p>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clock widget */}
        <ClockWidget />

        {/* Today's summary */}
        <Card className="lg:col-span-2">
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
                        {record.total_hours && (
                          <span className="font-medium">{record.total_hours}h</span>
                        )}
                        {((record.location as any)?.clockIn || (record.location as any)?.clockOut) && (
                          <LocationMapDialog
                            clockInLocation={(record.location as any)?.clockIn}
                            clockOutLocation={(record.location as any)?.clockOut}
                          />
                        )}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.className ?? ''}`}>
                          {cfg?.label ?? record.status}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Calendar and Summary View */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Calendar</CardTitle>
            <CardDescription>View monthly attendance history</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { if (date) setSelectedDate(date) }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              className="rounded-md border p-4"
              modifiers={{
                present: (date) => monthAttendance?.some(a => a.status === 'present' && isSameDay(new Date(a.date), date)) ?? false,
                late: (date) => monthAttendance?.some(a => a.status === 'late' && isSameDay(new Date(a.date), date)) ?? false,
                absent: (date) => monthAttendance?.some(a => a.status === 'absent' && isSameDay(new Date(a.date), date)) ?? false,
              }}
              modifiersClassNames={{
                present: 'bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-900/50 dark:text-emerald-200',
                late: 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-900/50 dark:text-amber-200',
                absent: 'bg-red-100 text-red-900 font-bold dark:bg-red-900/50 dark:text-red-200',
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Monthly Summary</CardTitle>
                <CardDescription>Total days per employee for {format(calendarMonth, 'MMMM yyyy')}</CardDescription>
              </div>
              <Badge variant="secondary">{monthlySummary.length} employees</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {monthlySummary.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No attendance records found for this month.
                </p>
              ) : (
                monthlySummary.map((stats, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {`${stats.employee?.first_name?.[0] ?? ''}${stats.employee?.last_name?.[0] ?? ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{stats.employee?.first_name} {stats.employee?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{stats.employee?.departments?.name || 'No Dept'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-medium pl-2">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="size-3.5" />
                        <span>{stats.present}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="size-3.5" />
                        <span>{stats.late}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="size-3.5" />
                        <span>{stats.absent}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <DailyAttendanceMap records={filteredAttendance || []} />
      </div>
    </div>
  )
}
