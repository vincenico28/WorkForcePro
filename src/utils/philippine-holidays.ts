/**
 * Philippine Statutory Holiday Calendar & DOLE Wage Compliance Engine
 * 
 * Compliant with:
 * - Article 94, Labor Code of the Philippines (Right to Holiday Pay)
 * - Republic Act No. 9492 (Rationalizing the Celebration of Holidays)
 * - Republic Act No. 10966 (Feast of the Immaculate Conception)
 * - Republic Act No. 9849 (National Heroes Day & Eid'l Adha)
 * - DOLE Labor Advisory No. 27 & Annual Holiday Pay Advisories
 */

export type PhilippineHolidayType = 'regular' | 'special_non_working' | 'special_working'

export interface PhilippineHoliday {
  date: string // YYYY-MM-DD
  name: string
  localName?: string
  type: PhilippineHolidayType
  legalBasis: string
  payRuleUnworked: string
  payRuleWorked: string
  payRuleWorkedRestDay: string
  isPaidIfUnworked: boolean
  workedMultiplier: number // 2.0 for regular (200%), 1.3 for special non-working (130%)
  unworkedMultiplier: number // 1.0 for regular (100%), 0.0 for special non-working (0%)
  description: string
}

// Master Static & Computed Holidays by Year
export const PHILIPPINE_HOLIDAYS_BY_YEAR: Record<number, PhilippineHoliday[]> = {
  2025: [
    {
      date: '2025-01-01',
      name: "New Year's Day",
      localName: 'Araw ng Bagong Taon',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Official nationwide regular holiday ushering in the new year.'
    },
    {
      date: '2025-01-29',
      name: 'Chinese Lunar New Year',
      localName: 'Bagong Taong Tsino',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" principle applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Nationwide special non-working day for Lunar New Year.'
    },
    {
      date: '2025-02-25',
      name: 'EDSA People Power Revolution Anniversary',
      localName: 'Anibersaryo ng EDSA Revolution',
      type: 'special_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Standard Workday Pay Rules',
      payRuleWorked: '100% Basic Daily Rate',
      payRuleWorkedRestDay: '130% Rest Day Premium if scheduled',
      isPaidIfUnworked: false,
      workedMultiplier: 1.0,
      unworkedMultiplier: 0.0,
      description: 'Special commemoration day.'
    },
    {
      date: '2025-03-31',
      name: "Eid'l Fitr",
      localName: 'Pista ng Pagtatapos ng Ramadan',
      type: 'regular',
      legalBasis: 'RA 9177 / Presidential Proclamation',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Feast of Ramadhan Islamic Holiday.'
    },
    {
      date: '2025-04-09',
      name: 'Araw ng Kagitingan (Day of Valor)',
      localName: 'Araw ng Kagitingan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemoration of the Fall of Bataan and Filipino heroism.'
    },
    {
      date: '2025-04-17',
      name: 'Maundy Thursday',
      localName: 'Huwebes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2025-04-18',
      name: 'Good Friday',
      localName: 'Biyernes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2025-04-19',
      name: 'Black Saturday',
      localName: 'Sabado de Gloria',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday during Holy Week.'
    },
    {
      date: '2025-05-01',
      name: 'Labor Day',
      localName: 'Araw ng Paggawa',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'National holiday honoring Filipino workforce and labor rights.'
    },
    {
      date: '2025-06-06',
      name: "Eid'l Adha",
      localName: 'Pista ng Pagpapakasakit',
      type: 'regular',
      legalBasis: 'RA 9849 / Presidential Proclamation',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Feast of the Sacrifice Islamic regular holiday.'
    },
    {
      date: '2025-06-12',
      name: 'Independence Day',
      localName: 'Araw ng Kasarinlan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemoration of Philippine Independence Declaration of 1898.'
    },
    {
      date: '2025-08-21',
      name: 'Ninoy Aquino Day',
      localName: 'Araw ng Kabayanihan ni Ninoy Aquino',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 9256',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday commemorating Senator Ninoy Aquino.'
    },
    {
      date: '2025-08-25',
      name: 'National Heroes Day',
      localName: 'Araw ng mga Bayani',
      type: 'regular',
      legalBasis: 'Republic Act No. 9492 (Last Monday of August)',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Honoring all Philippine national heroes.'
    },
    {
      date: '2025-11-01',
      name: "All Saints' Day (Undas)",
      localName: 'Araw ng mga Santo',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for All Saints Day.'
    },
    {
      date: '2025-11-02',
      name: "All Souls' Day",
      localName: 'Araw ng mga Patay',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for All Souls Day.'
    },
    {
      date: '2025-11-30',
      name: 'Bonifacio Day',
      localName: 'Kaarawan ni Bonifacio',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Birth anniversary of Gat Andres Bonifacio.'
    },
    {
      date: '2025-12-08',
      name: 'Feast of the Immaculate Conception',
      localName: 'Pista ng Kalinis-linisang Paglilihi',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 10966',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday across the country.'
    },
    {
      date: '2025-12-24',
      name: 'Christmas Eve',
      localName: 'Bisperas ng Pasko',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday before Christmas.'
    },
    {
      date: '2025-12-25',
      name: 'Christmas Day',
      localName: 'Araw ng Pasko',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Nationwide regular holiday celebrating Christmas.'
    },
    {
      date: '2025-12-30',
      name: 'Rizal Day',
      localName: 'Araw ng Kabayanihan ni Rizal',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemorating martyrdom of Dr. Jose Rizal.'
    },
    {
      date: '2025-12-31',
      name: "Last Day of the Year (New Year's Eve)",
      localName: 'Bisperas ng Bagong Taon',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for year-end festivities.'
    }
  ],
  2026: [
    {
      date: '2026-01-01',
      name: "New Year's Day",
      localName: 'Araw ng Bagong Taon',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Official nationwide regular holiday ushering in the new year.'
    },
    {
      date: '2026-02-17',
      name: 'Chinese Lunar New Year',
      localName: 'Bagong Taong Tsino',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Nationwide special non-working day for Lunar New Year.'
    },
    {
      date: '2026-02-25',
      name: 'EDSA People Power Revolution Anniversary',
      localName: 'Anibersaryo ng EDSA Revolution',
      type: 'special_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Standard Workday Pay Rules',
      payRuleWorked: '100% Basic Daily Rate',
      payRuleWorkedRestDay: '130% Rest Day Premium if scheduled',
      isPaidIfUnworked: false,
      workedMultiplier: 1.0,
      unworkedMultiplier: 0.0,
      description: 'Special commemoration day.'
    },
    {
      date: '2026-03-20',
      name: "Eid'l Fitr",
      localName: 'Pista ng Pagtatapos ng Ramadan',
      type: 'regular',
      legalBasis: 'RA 9177 / Presidential Proclamation',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Feast of Ramadhan Islamic regular holiday.'
    },
    {
      date: '2026-04-02',
      name: 'Maundy Thursday',
      localName: 'Huwebes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2026-04-03',
      name: 'Good Friday',
      localName: 'Biyernes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2026-04-04',
      name: 'Black Saturday',
      localName: 'Sabado de Gloria',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday during Holy Week.'
    },
    {
      date: '2026-04-09',
      name: 'Araw ng Kagitingan (Day of Valor)',
      localName: 'Araw ng Kagitingan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemoration of the Fall of Bataan and Filipino heroism.'
    },
    {
      date: '2026-05-01',
      name: 'Labor Day',
      localName: 'Araw ng Paggawa',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'National holiday honoring Filipino workforce and labor rights.'
    },
    {
      date: '2026-05-27',
      name: "Eid'l Adha",
      localName: 'Pista ng Pagpapakasakit',
      type: 'regular',
      legalBasis: 'RA 9849 / Presidential Proclamation',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Feast of the Sacrifice Islamic regular holiday.'
    },
    {
      date: '2026-06-12',
      name: 'Independence Day',
      localName: 'Araw ng Kasarinlan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemoration of Philippine Independence Declaration of 1898.'
    },
    {
      date: '2026-08-21',
      name: 'Ninoy Aquino Day',
      localName: 'Araw ng Kabayanihan ni Ninoy Aquino',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 9256',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday commemorating Senator Ninoy Aquino.'
    },
    {
      date: '2026-08-31',
      name: 'National Heroes Day',
      localName: 'Araw ng mga Bayani',
      type: 'regular',
      legalBasis: 'Republic Act No. 9492 (Last Monday of August)',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Honoring all Philippine national heroes.'
    },
    {
      date: '2026-11-01',
      name: "All Saints' Day (Undas)",
      localName: 'Araw ng mga Santo',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for All Saints Day.'
    },
    {
      date: '2026-11-02',
      name: "All Souls' Day",
      localName: 'Araw ng mga Patay',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for All Souls Day.'
    },
    {
      date: '2026-11-30',
      name: 'Bonifacio Day',
      localName: 'Kaarawan ni Bonifacio',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Birth anniversary of Gat Andres Bonifacio.'
    },
    {
      date: '2026-12-08',
      name: 'Feast of the Immaculate Conception',
      localName: 'Pista ng Kalinis-linisang Paglilihi',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 10966',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday across the country.'
    },
    {
      date: '2026-12-24',
      name: 'Christmas Eve',
      localName: 'Bisperas ng Pasko',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday before Christmas.'
    },
    {
      date: '2026-12-25',
      name: 'Christmas Day',
      localName: 'Araw ng Pasko',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Nationwide regular holiday celebrating Christmas.'
    },
    {
      date: '2026-12-30',
      name: 'Rizal Day',
      localName: 'Araw ng Kabayanihan ni Rizal',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Commemorating martyrdom of Dr. Jose Rizal.'
    },
    {
      date: '2026-12-31',
      name: "Last Day of the Year (New Year's Eve)",
      localName: 'Bisperas ng Bagong Taon',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day for year-end festivities.'
    }
  ],
  2027: [
    {
      date: '2027-01-01',
      name: "New Year's Day",
      localName: 'Araw ng Bagong Taon',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Official nationwide regular holiday.'
    },
    {
      date: '2027-02-06',
      name: 'Chinese Lunar New Year',
      localName: 'Bagong Taong Tsino',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate (100% + 30% Premium)',
      payRuleWorkedRestDay: '150% of Basic Daily Rate (100% + 50% Rest Day Premium)',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Nationwide special non-working day.'
    },
    {
      date: '2027-03-25',
      name: 'Maundy Thursday',
      localName: 'Huwebes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2027-03-26',
      name: 'Good Friday',
      localName: 'Biyernes Santo',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Holy Week regular paid holiday.'
    },
    {
      date: '2027-04-09',
      name: 'Araw ng Kagitingan (Day of Valor)',
      localName: 'Araw ng Kagitingan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94 / RA 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Day of Valor regular holiday.'
    },
    {
      date: '2027-05-01',
      name: 'Labor Day',
      localName: 'Araw ng Paggawa',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Labor Day regular holiday.'
    },
    {
      date: '2027-06-12',
      name: 'Independence Day',
      localName: 'Araw ng Kasarinlan',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Independence Day regular holiday.'
    },
    {
      date: '2027-08-21',
      name: 'Ninoy Aquino Day',
      localName: 'Araw ng Kabayanihan ni Ninoy Aquino',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 9256',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate',
      payRuleWorkedRestDay: '150% of Basic Daily Rate',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday.'
    },
    {
      date: '2027-08-30',
      name: 'National Heroes Day',
      localName: 'Araw ng mga Bayani',
      type: 'regular',
      legalBasis: 'Republic Act No. 9492',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'National Heroes Day.'
    },
    {
      date: '2027-11-01',
      name: "All Saints' Day (Undas)",
      localName: 'Araw ng mga Santo',
      type: 'special_non_working',
      legalBasis: 'Presidential Proclamation',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate',
      payRuleWorkedRestDay: '150% of Basic Daily Rate',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working day.'
    },
    {
      date: '2027-11-30',
      name: 'Bonifacio Day',
      localName: 'Kaarawan ni Bonifacio',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Bonifacio Day regular holiday.'
    },
    {
      date: '2027-12-08',
      name: 'Feast of the Immaculate Conception',
      localName: 'Pista ng Kalinis-linisang Paglilihi',
      type: 'special_non_working',
      legalBasis: 'Republic Act No. 10966',
      payRuleUnworked: 'Unpaid ("No Work, No Pay" applies)',
      payRuleWorked: '130% of Basic Daily Rate',
      payRuleWorkedRestDay: '150% of Basic Daily Rate',
      isPaidIfUnworked: false,
      workedMultiplier: 1.3,
      unworkedMultiplier: 0.0,
      description: 'Special non-working holiday.'
    },
    {
      date: '2027-12-25',
      name: 'Christmas Day',
      localName: 'Araw ng Pasko',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Christmas Day regular holiday.'
    },
    {
      date: '2027-12-30',
      name: 'Rizal Day',
      localName: 'Araw ng Kabayanihan ni Rizal',
      type: 'regular',
      legalBasis: 'Labor Code Art. 94',
      payRuleUnworked: '100% Paid (Full Daily Rate if unworked)',
      payRuleWorked: '200% (Double Pay for first 8 hours)',
      payRuleWorkedRestDay: '260% (Double Pay + 30% Rest Day Premium)',
      isPaidIfUnworked: true,
      workedMultiplier: 2.0,
      unworkedMultiplier: 1.0,
      description: 'Rizal Day regular holiday.'
    }
  ]
}

/**
 * Get all holidays for a given year.
 */
export function getPhilippineHolidays(year: number): PhilippineHoliday[] {
  return PHILIPPINE_HOLIDAYS_BY_YEAR[year] || PHILIPPINE_HOLIDAYS_BY_YEAR[2026] || []
}

/**
 * Check if a given date is a Philippine holiday.
 */
export function getHolidayForDate(dateInput: string | Date): PhilippineHoliday | undefined {
  let dateStr = ''
  if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0]
  } else {
    const y = dateInput.getFullYear()
    const m = String(dateInput.getMonth() + 1).padStart(2, '0')
    const d = String(dateInput.getDate()).padStart(2, '0')
    dateStr = `${y}-${m}-${d}`
  }
  
  const year = parseInt(dateStr.split('-')[0], 10)
  const holidays = getPhilippineHolidays(year)
  return holidays.find(h => h.date === dateStr)
}

/**
 * Check if a given date is a Philippine holiday.
 */
export function isPhilippineHoliday(dateInput: string | Date): boolean {
  return !!getHolidayForDate(dateInput)
}

/**
 * Get all holidays occurring within a specific month.
 */
export function getHolidaysForMonth(year: number, monthIndex0to11: number): PhilippineHoliday[] {
  const holidays = getPhilippineHolidays(year)
  const monthStr = String(monthIndex0to11 + 1).padStart(2, '0')
  const prefix = `${year}-${monthStr}`
  return holidays.filter(h => h.date.startsWith(prefix))
}

/**
 * DOLE Statutory Holiday Pay Rules Summary Constants
 */
export const DOLE_HOLIDAY_PAY_RULES = {
  regular: {
    badgeLabel: 'Regular Holiday (Paid 100%)',
    unworkedText: 'Paid 100% of Daily Wage if unworked (Art. 94 Labor Code)',
    workedText: '200% (Double Pay) for first 8 hours worked',
    workedRestDayText: '260% (Double Pay + 30% Rest Day Premium)',
    overtimeText: 'Additional 30% of hourly rate on that day (260% / 338%)',
    color: '#3b82f6', // blue
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  },
  special_non_working: {
    badgeLabel: 'Special Non-Working (Unpaid/130%)',
    unworkedText: 'Unpaid ("No Work, No Pay" rule applies unless company policy provides pay)',
    workedText: '130% of Basic Daily Rate (100% base + 30% premium)',
    workedRestDayText: '150% of Basic Daily Rate (100% base + 50% rest day premium)',
    overtimeText: 'Additional 30% of hourly rate on that day (169% / 195%)',
    color: '#f59e0b', // amber
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  special_working: {
    badgeLabel: 'Special Working Holiday',
    unworkedText: 'Standard workday rules (Unworked = Unpaid unless on approved paid leave)',
    workedText: '100% of Basic Daily Rate (No statutory premium required)',
    workedRestDayText: '130% if worked on declared rest day',
    overtimeText: 'Standard 125% regular overtime pay',
    color: '#8b5cf6', // violet
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800'
  }
}
