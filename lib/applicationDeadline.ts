/** Last moment students can submit (Asia/Bangkok — school local time). */
export const APPLICATIONS_DEADLINE_ISO = '2026-05-22T23:59:59+07:00'

export const APPLICATIONS_DEADLINE_LABEL = '22 May, 11:59 PM'

export const APPLICATIONS_DEADLINE_NOTICE = `All club applications close on ${APPLICATIONS_DEADLINE_LABEL}.`

/** Short copy for inline hints (browse clubs, join form). */
export const APPLICATIONS_DEADLINE_HINT = `Applications close ${APPLICATIONS_DEADLINE_LABEL}.`

export const APPLICATIONS_CLOSED_MESSAGE = `Club applications closed on ${APPLICATIONS_DEADLINE_LABEL}.`

export const APPLICATIONS_CLOSED_HINT = 'Applications closed.'

export function areClubApplicationsOpen(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(APPLICATIONS_DEADLINE_ISO).getTime()
}

/** Club must be open for members and before the global application deadline. */
export function canSubmitClubApplication(clubAccepting: boolean, now: Date = new Date()): boolean {
  return clubAccepting && areClubApplicationsOpen(now)
}
