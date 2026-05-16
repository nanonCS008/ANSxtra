/** Clubs that do not accept ANSxtra form applications (external / in-person process only). */
export const EXTERNAL_SIGNUP_CLUB_IDS = new Set(['student-council'])

export function isExternalSignupClub(clubId: string): boolean {
  return EXTERNAL_SIGNUP_CLUB_IDS.has(clubId)
}
