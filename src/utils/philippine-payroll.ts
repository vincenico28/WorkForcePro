/**
 * Philippine HR & Labor Code Payroll Calculation Engine
 * 
 * Compliant with:
 * - Republic Act No. 11199 (Social Security Act of 2018 - 2024-2026 Schedule)
 * - Republic Act No. 11223 (Universal Health Care Act - PhilHealth 5% Premium)
 * - Republic Act No. 9679 & HDMF Circular No. 460 (Pag-IBIG Fund 2% Cap)
 * - Republic Act No. 10963 (TRAIN Law - Revised Withholding Tax Tables)
 * - Presidential Decree No. 851 (13th Month Pay Law)
 * - Presidential Decree No. 442 (Labor Code of the Philippines - OT & Night Differential)
 */

export interface SSSContribution {
  monthlySalaryCredit: number
  employeeShare: number
  employerShare: number
  ecShare: number // Employees' Compensation (EC) fund paid by employer
  wispEmployeeShare: number // Mandatory Provident Fund (WISP)
  wispEmployerShare: number
  totalEmployee: number
  totalEmployer: number
  totalContribution: number
}

export interface PhilHealthContribution {
  monthlyBasicSalary: number
  employeeShare: number
  employerShare: number
  totalContribution: number
}

export interface PagIbigContribution {
  monthlyBasicSalary: number
  employeeShare: number
  employerShare: number
  totalContribution: number
}

export interface TaxCalculation {
  taxableIncome: number
  withholdingTax: number
  taxBracket: string
}

export interface PhilippinePayrollItem {
  employeeId: string
  employeeName: string
  position: string
  department: string
  employeeNo: string
  tinNo?: string
  sssNo?: string
  philHealthNo?: string
  pagIbigNo?: string
  
  // Cutoff details
  cutoffType: 'first_half' | 'second_half' | 'monthly'
  periodLabel: string
  
  // Hours & Rates
  baseHourlyRate: number
  monthlyBasicEquivalent: number
  regularHoursWorked: number
  overtimeHours: number
  nightDiffHours: number
  holidayHours: number
  paidLeaveDays?: number
  unpaidLeaveDays?: number
  leaveBreakdown?: string[]
  paidLeaveHours: number
  unpaidLeaveHours: number
  tardinessMinutes: number
  undertimeMinutes: number
  
  // Earnings
  basicPayEarned: number
  overtimePay: number
  nightDiffPay: number
  holidayPay: number
  paidLeavePay: number
  leaveConversionBonus?: number // DOLE Art. 95 Unused Leave Monetization Bonus
  leaveConversionDays?: number // Total unused convertible days converted to cash
  deMinimisAllowance: number // Non-taxable (Rice, clothing, laundry)
  performanceIncentive: number
  grossEarnings: number
  
  // Tardiness & Absences Deductions
  tardinessDeduction: number
  undertimeDeduction: number
  
  // Statutory Government Contributions (Pro-rated for semi-monthly or full for monthly)
  sss: SSSContribution
  philHealth: PhilHealthContribution
  pagIbig: PagIbigContribution
  totalStatutoryEmployee: number
  totalStatutoryEmployer: number
  
  // Tax
  tax: TaxCalculation
  
  // Summary
  totalDeductions: number
  netTakeHomePay: number
  
  // Accruals
  accrued13thMonthPay: number
  
  status: 'ready' | 'pending' | 'no_data'
  entriesCount: number
}

/**
 * Calculate SSS Contribution based on Monthly Salary Credit (MSC)
 * 2024-2026: 14% total (4.5% Employee, 9.5% Employer)
 * Minimum MSC = ₱4,000 | Maximum Regular MSC = ₱20,000 | Maximum WISP MSC = ₱30,000
 */
export function calculateSSS(monthlyBasicSalary: number): SSSContribution {
  const salary = Math.max(0, monthlyBasicSalary)
  
  // Clamp MSC between 4,000 and 30,000 with 500 increments
  let msc = Math.round(salary / 500) * 500
  if (msc < 4000) msc = 4000
  if (msc > 30000) msc = 30000

  // Regular SSS MSC (capped at 20,000)
  const regularMSC = Math.min(msc, 20000)
  const regularEE = regularMSC * 0.045
  const regularER = regularMSC * 0.095

  // WISP / Mandatory Provident Fund MSC (for MSC > 20,000 up to 30,000)
  const wispMSC = Math.max(0, msc - 20000)
  const wispEE = wispMSC * 0.045
  const wispER = wispMSC * 0.095

  // EC (Employees' Compensation) - Paid solely by Employer: ₱10 for MSC <= 14,500; ₱30 for MSC > 14,500
  const ec = msc > 14500 ? 30 : 10

  const totalEE = Math.round((regularEE + wispEE) * 100) / 100
  const totalER = Math.round((regularER + wispER + ec) * 100) / 100

  return {
    monthlySalaryCredit: msc,
    employeeShare: totalEE,
    employerShare: totalER,
    ecShare: ec,
    wispEmployeeShare: Math.round(wispEE * 100) / 100,
    wispEmployerShare: Math.round(wispER * 100) / 100,
    totalEmployee: totalEE,
    totalEmployer: totalER,
    totalContribution: totalEE + totalER,
  }
}

/**
 * Calculate PhilHealth Premium (RA 11223)
 * Premium Rate: 5.0% (2.5% Employee, 2.5% Employer)
 * Floor: ₱10,000 (Min: ₱500 total, ₱250 EE)
 * Ceiling: ₱100,000 (Max: ₱5,000 total, ₱2,500 EE)
 */
export function calculatePhilHealth(monthlyBasicSalary: number): PhilHealthContribution {
  const salary = Math.max(0, monthlyBasicSalary)
  const clampedSalary = Math.min(Math.max(salary, 10000), 100000)
  
  const totalPremium = clampedSalary * 0.05
  const eeShare = Math.round((totalPremium / 2) * 100) / 100
  const erShare = Math.round((totalPremium / 2) * 100) / 100

  return {
    monthlyBasicSalary: clampedSalary,
    employeeShare: eeShare,
    employerShare: erShare,
    totalContribution: eeShare + erShare,
  }
}

/**
 * Calculate Pag-IBIG / HDMF Contribution (Circular No. 460)
 * 2% Employee (Max ₱200/mo), 2% Employer (Max ₱200/mo)
 */
export function calculatePagIbig(monthlyBasicSalary: number): PagIbigContribution {
  const salary = Math.max(0, monthlyBasicSalary)
  const ee = Math.min(salary * 0.02, 200)
  const er = Math.min(salary * 0.02, 200)

  return {
    monthlyBasicSalary: salary,
    employeeShare: Math.round(ee * 100) / 100,
    employerShare: Math.round(er * 100) / 100,
    totalContribution: Math.round((ee + er) * 100) / 100,
  }
}

/**
 * Calculate BIR Withholding Tax (TRAIN Law RA 10963)
 * Monthly and Semi-Monthly Tax Brackets
 */
export function calculateWithholdingTax(
  taxableIncome: number,
  frequency: 'monthly' | 'semi_monthly' = 'monthly'
): TaxCalculation {
  const income = Math.max(0, taxableIncome)

  if (frequency === 'semi_monthly') {
    // Semi-Monthly Tax Table (TRAIN Law)
    if (income <= 10416.67) {
      return { taxableIncome: income, withholdingTax: 0, taxBracket: '0% (Tax Exempt)' }
    } else if (income <= 16666.67) {
      const tax = (income - 10416.67) * 0.15
      return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '15% over ₱10,417' }
    } else if (income <= 33333.33) {
      const tax = 937.50 + (income - 16666.67) * 0.20
      return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱937.50 + 20% over ₱16,667' }
    } else if (income <= 83333.33) {
      const tax = 4270.83 + (income - 33333.33) * 0.25
      return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱4,270.83 + 25% over ₱33,333' }
    } else if (income <= 333333.33) {
      const tax = 16770.83 + (income - 83333.33) * 0.30
      return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱16,770.83 + 30% over ₱83,333' }
    } else {
      const tax = 91770.83 + (income - 333333.33) * 0.35
      return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱91,770.83 + 35% over ₱333,333' }
    }
  }

  // Monthly Tax Table (TRAIN Law)
  if (income <= 20833.33) {
    return { taxableIncome: income, withholdingTax: 0, taxBracket: '0% (Tax Exempt)' }
  } else if (income <= 33333.33) {
    const tax = (income - 20833.33) * 0.15
    return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '15% over ₱20,833' }
  } else if (income <= 66666.67) {
    const tax = 1875.00 + (income - 33333.33) * 0.20
    return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱1,875 + 20% over ₱33,333' }
  } else if (income <= 166666.67) {
    const tax = 8541.67 + (income - 66666.67) * 0.25
    return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱8,541.67 + 25% over ₱66,667' }
  } else if (income <= 666666.67) {
    const tax = 33541.67 + (income - 166666.67) * 0.30
    return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱33,541.67 + 30% over ₱166,667' }
  } else {
    const tax = 183541.67 + (income - 666666.67) * 0.35
    return { taxableIncome: income, withholdingTax: Math.round(tax * 100) / 100, taxBracket: '₱183,541.67 + 35% over ₱666,667' }
  }
}

/**
 * Format Currency to Philippine Peso (PHP ₱)
 */
export function formatPHP(amount: number, includeDecimals = true): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount)
}
