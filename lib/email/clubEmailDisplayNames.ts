/** Overrides for club names in student-facing emails only (site UI unchanged). */
const CLUB_EMAIL_DISPLAY_NAMES: Record<string, string> = {
  mun: 'Model United Nations',
};

export function getClubEmailDisplayName(clubId: string, fallbackName: string): string {
  return CLUB_EMAIL_DISPLAY_NAMES[clubId] ?? fallbackName;
}
