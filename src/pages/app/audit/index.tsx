import { useState } from 'react'
import { format } from 'date-fns'
import { Shield, Search, Loader2 } from 'lucide-react'
import { useAuditLogs } from '@/hooks/use-audit'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Navigate } from 'react-router-dom'

export default function AuditLogPage() {
  const { can } = usePermissions()
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  
  const { data, isLoading } = useAuditLogs(page, 50, actionFilter, resourceFilter)
  
  if (!can.isSuperAdmin()) {
    return <Navigate to="/app/dashboard" replace />
  }

  const logs = data?.data ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / 50)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            Security Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Immutable ledger of all system activity and data mutations</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Resource Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="timesheet_entries">Timesheets</SelectItem>
                  <SelectItem value="leave_requests">Leave Requests</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="schedules">Schedules</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground font-mono">
              Total Logs: {totalCount}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User / Employee</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead className="text-right">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No audit logs found matching the criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="font-mono text-xs">
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.employees ? `${log.employees.first_name} ${log.employees.last_name}` : log.users?.email || 'System'}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          log.action === 'DELETE' ? 'text-rose-500' :
                          log.action === 'CREATE' ? 'text-emerald-500' :
                          log.action === 'UPDATE' ? 'text-amber-500' : 'text-blue-500'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate" title={log.resource_id}>
                        {log.resource_id}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || isLoading}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
