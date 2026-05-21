/** First-meeting copy for student approval emails only (not stored on applications). */
export const CLUB_APPROVAL_FIRST_MEETING_DETAILS: Record<string, string> = {
  'unicef-ambassador': 'Tuesday 26th May, Lunch 2, 14-101',
  'school-show': 'Details will be posted later!',
  'eco-committee': 'Friday 29th May, Milk break, 12-307',
  'interact-club': 'Wednesday 27th May, Milk break, 12-209',
  'operation-smile': 'Tuesday 26th May, Lunch 2, 12-101',
  'enterprise-club': 'Friday 29th May, Milk break, 12-101',
  mun: 'Wednesday 27th May, Lunch 1, 12-209',
  'spark-club': 'Wednesday 27th May, Milk break, 12-101',
  tedx: 'Thursday 28th May, Lunch 2, 12-302',
  'duke-of-edinburgh': `Friday – Period 6

Meeting Points for Current Participants and Award Leaders starting this week:
Bronze – 3-101
Silver – 14-101
Gold – 14-102

Please note: Award Leaders will email current participants for each level about the schedule of the meeting. The meeting will be by group, not all at once, so please wait for more information from Award Leaders.

For new applicants for all levels, we will inform you via email of the assembly time and location soon. Please wait for further notice.`,
};

const CLUB_NAME_ALIASES: Record<string, string> = {
  unicef: 'unicef-ambassador',
  'unicef ambassador': 'unicef-ambassador',
  'school show': 'school-show',
  'school show stage crew': 'school-show',
  'eco committee': 'eco-committee',
  interact: 'interact-club',
  'interact club': 'interact-club',
  'operation smile': 'operation-smile',
  enterprise: 'enterprise-club',
  'student enterprise club': 'enterprise-club',
  'enterprise club': 'enterprise-club',
  mun: 'mun',
  'model united nations': 'mun',
  spark: 'spark-club',
  'spark club': 'spark-club',
  tedx: 'tedx',
  'duke of edinburgh': 'duke-of-edinburgh',
  'duke of edinburgh international award': 'duke-of-edinburgh',
  dofe: 'duke-of-edinburgh',
};

export const APPROVAL_MEETING_DETAILS_FALLBACK = 'Meeting details will be shared soon.';

function normalizeClubKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function resolveClubId(clubId?: string | null, clubName?: string | null): string | null {
  const id = clubId?.trim();
  if (id && CLUB_APPROVAL_FIRST_MEETING_DETAILS[id]) return id;
  if (id && CLUB_APPROVAL_FIRST_MEETING_DETAILS[normalizeClubKey(id)]) {
    return normalizeClubKey(id);
  }

  const nameKey = clubName?.trim().toLowerCase() ?? '';
  if (nameKey && CLUB_NAME_ALIASES[nameKey]) return CLUB_NAME_ALIASES[nameKey];

  const slugFromName = normalizeClubKey(clubName ?? '');
  if (slugFromName && CLUB_APPROVAL_FIRST_MEETING_DETAILS[slugFromName]) return slugFromName;

  return id || slugFromName || null;
}

export function getClubApprovalFirstMeetingDetails(
  clubId?: string | null,
  clubName?: string | null
): string {
  const resolvedId = resolveClubId(clubId, clubName);
  if (resolvedId && CLUB_APPROVAL_FIRST_MEETING_DETAILS[resolvedId]) {
    return CLUB_APPROVAL_FIRST_MEETING_DETAILS[resolvedId];
  }
  return APPROVAL_MEETING_DETAILS_FALLBACK;
}
