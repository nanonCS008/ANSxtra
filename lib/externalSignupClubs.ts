/** Clubs that do not accept ANSxtra form applications (external / in-person process only). */
export const EXTERNAL_SIGNUP_CLUB_IDS = new Set(['student-council'])

export function isExternalSignupClub(clubId: string): boolean {
  return EXTERNAL_SIGNUP_CLUB_IDS.has(clubId)
}

export function getExternalSignupMessage(clubId: string): string {
  if (clubId === 'student-council') {
    return 'Sign-up is not through this site. Contact Mr Delaney if you want to join.'
  }
  return 'Applications for this club are handled outside ANSxtra. Please contact the club for details.'
}
