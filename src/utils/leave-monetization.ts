/**
 * Philippine DOLE Service Incentive Leave (SIL) & Annual Leave Monetization Engine
 * 
 * Legal Basis:
 * - DOLE Labor Code of the Philippines, Article 95 (Right to Service Incentive Leave)
 * - DOLE Handbook on Workers' Statutory Monetary Benefits (Section on SIL Monetization):
 *   "The service incentive leave may be used for sick and vacation leave purposes.
 *    The unused service incentive leave is commutable to its money equivalent at the 
 *    end of the year or prior to the annual reset."
 * - Company Policy Standard: Vacation Leave (VL) and Sick Leave (SL) are convertible to cash equivalent.
 */

import type { Employee, LeaveBalance, LeaveType } from '@/types'

export const CONVERTIBLE_LEAVE_CODES = ['VL', 'SL', 'SIL']

export interface EmployeeLeaveMonetization {
  employeeId: string
  employeeName: string
  employeeNo: string
  department: string
  position: string
  dailyRate: number
  unusedVLDays: number
  unusedSLDays: number
  otherConvertibleDays: number
  totalUnusedConvertibleDays: number
  cashBonus: number
  pushedToPayroll: boolean
  pushedAt?: string
}

export interface LeaveMonetizationSummary {
  year: number
  totalEligibleEmployees: number
  totalUnusedDays: number
  totalCashBonusPayout: number
  isPushedToPayroll: boolean
  pushedAt?: string
  records: EmployeeLeaveMonetization[]
}

/**
 * Check if a leave type is legally convertible to cash under DOLE Art. 95 / Company Policy
 */
export function isConvertibleLeaveType(code?: string): boolean {
  if (!code) return false
  return CONVERTIBLE_LEAVE_CODES.includes(code.toUpperCase())
}

/**
 * Calculate the daily wage rate of an employee based on their salary info
 */
export function calculateDailyWageRate(salaryInfo?: any): number {
  if (!salaryInfo) return 2000 // Default fallback: ₱250/hr * 8h

  if (salaryInfo.hourly_rate) {
    return Number(salaryInfo.hourly_rate) * 8
  }

  if (salaryInfo.base_salary) {
    // 22 working days monthly divisor standard
    return Math.round((Number(salaryInfo.base_salary) / 22) * 100) / 100
  }

  return 2000
}

const STORAGE_KEY_PREFIX = 'ph_wms_leave_monetization_ledger_'

/**
 * Compute the Year-End Leave Monetization Ledger for all active employees
 */
export function computeLeaveMonetizationLedger(
  employees: Employee[],
  allBalances: LeaveBalance[],
  leaveTypes: LeaveType[],
  year: number = new Date().getFullYear()
): LeaveMonetizationSummary {
  const existingLedger = getStoredLeaveMonetization(year)
  const isPushed = existingLedger?.isPushedToPayroll ?? false

  const records: EmployeeLeaveMonetization[] = employees
    .filter(e => e.status === 'active')
    .map(emp => {
      const dailyRate = calculateDailyWageRate(emp.salary_info)
      const empBalances = allBalances.filter(b => b.employee_id === emp.id && b.year === year)

      let unusedVL = 0
      let unusedSL = 0
      let otherConvertible = 0

      empBalances.forEach(b => {
        const type = leaveTypes.find(lt => lt.id === b.leave_type_id) || b.leave_types
        const code = type?.code?.toUpperCase() || ''

        if (isConvertibleLeaveType(code)) {
          const remaining = Math.max(0, (b.allocated_days || 0) - (b.used_days || 0))
          if (code === 'VL') {
            unusedVL += remaining
          } else if (code === 'SL') {
            unusedSL += remaining
          } else {
            otherConvertible += remaining
          }
        }
      })

      const totalUnusedDays = unusedVL + unusedSL + otherConvertible
      const cashBonus = Math.round(totalUnusedDays * dailyRate * 100) / 100

      return {
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        employeeNo: (emp as any).employee_no || `PHL-${emp.id.substring(0, 4).toUpperCase()}`,
        department: emp.departments?.name || 'Logistics',
        position: emp.position || 'Staff',
        dailyRate,
        unusedVLDays: unusedVL,
        unusedSLDays: unusedSL,
        otherConvertibleDays: otherConvertible,
        totalUnusedConvertibleDays: totalUnusedDays,
        cashBonus,
        pushedToPayroll: isPushed,
        pushedAt: existingLedger?.pushedAt,
      }
    })

  const totalUnusedDays = records.reduce((sum, r) => sum + r.totalUnusedConvertibleDays, 0)
  const totalCashBonusPayout = records.reduce((sum, r) => sum + r.cashBonus, 0)

  return {
    year,
    totalEligibleEmployees: records.length,
    totalUnusedDays,
    totalCashBonusPayout,
    isPushedToPayroll: isPushed,
    pushedAt: existingLedger?.pushedAt,
    records,
  }
}

/**
 * Retrieve saved leave monetization ledger from persistent storage
 */
export function getStoredLeaveMonetization(year: number = new Date().getFullYear()): LeaveMonetizationSummary | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${year}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Save the leave monetization ledger to persistent storage
 */
export function saveLeaveMonetization(summary: LeaveMonetizationSummary): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${summary.year}`, JSON.stringify(summary))
    window.dispatchEvent(new CustomEvent('wms:leave-monetization-updated', { detail: summary }))
  } catch (err) {
    console.error('Failed to save leave monetization', err)
  }
}

/**
 * Mark the monetization ledger as pushed to Payroll
 */
export function pushMonetizationToPayroll(summary: LeaveMonetizationSummary): LeaveMonetizationSummary {
  const updated: LeaveMonetizationSummary = {
    ...summary,
    isPushedToPayroll: true,
    pushedAt: new Date().toISOString(),
    records: summary.records.map(r => ({
      ...r,
      pushedToPayroll: true,
      pushedAt: new Date().toISOString(),
    })),
  }
  saveLeaveMonetization(updated)
  return updated
}
