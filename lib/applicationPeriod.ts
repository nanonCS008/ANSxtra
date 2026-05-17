/** Shown to students (browse clubs, errors). */
export const APPLICATION_DEADLINE_DISPLAY = 'Thursday 21 May'

/**
 * End of the application window (set in Vercel as APPLICATION_PERIOD_END_ISO).
 * Example: 2026-05-21T23:59:59+07:00 (end of Thursday 21 May, ICT).
 */
export function getApplicationPeriodEndDate(): Date | null {
  const raw = process.env.APPLICATION_PERIOD_END_ISO?.trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getApplicationPeriodDigestKey(): string | null {
  const raw = process.env.APPLICATION_PERIOD_END_ISO?.trim()
  if (!raw) return null
  return `application-period-summary:v1:${raw}`
}

export function isApplicationPeriodOpen(now = new Date()): boolean {
  const end = getApplicationPeriodEndDate()
  if (!end) return true
  return now.getTime() <= end.getTime()
}
