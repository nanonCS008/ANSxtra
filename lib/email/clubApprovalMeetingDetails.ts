export type ClubApprovalMeetingSchedule = {
  meetingDay: string;
  meetingTime: string;
  location: string;
  /** Shown below the table when extra context is needed (e.g. Duke of Edinburgh). */
  notes?: string;
};

/** First-meeting schedule for student approval emails only (not stored on applications). */
export const CLUB_APPROVAL_FIRST_MEETING_DETAILS: Record<string, ClubApprovalMeetingSchedule> = {
  'unicef-ambassador': {
    meetingDay: 'Tuesday 26th May',
    meetingTime: 'Lunch 2',
    location: '14-101',
  },
  'school-show': {
    meetingDay: 'To be announced',
    meetingTime: '—',
    location: 'Details will be posted later!',
  },
  'eco-committee': {
    meetingDay: 'Friday 29th May',
    meetingTime: 'Milk break',
    location: '12-307',
  },
  'interact-club': {
    meetingDay: 'Wednesday 27th May',
    meetingTime: 'Milk break',
    location: '12-209',
  },
  'operation-smile': {
    meetingDay: 'Tuesday 26th May',
    meetingTime: 'Lunch 2',
    location: '12-101',
  },
  'enterprise-club': {
    meetingDay: 'Friday 29th May',
    meetingTime: 'Milk break',
    location: '12-101',
  },
  mun: {
    meetingDay: 'Wednesday 27th May',
    meetingTime: 'Lunch 1',
    location: '12-209',
  },
  'spark-club': {
    meetingDay: 'Wednesday 27th May',
    meetingTime: 'Milk break',
    location: '12-101',
  },
  tedx: {
    meetingDay: 'Thursday 28th May',
    meetingTime: 'Lunch 2',
    location: '12-302',
  },
  'duke-of-edinburgh': {
    meetingDay: '',
    meetingTime: '',
    location: 'Miss Eden will email you details later',
  },
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

export const APPROVAL_MEETING_DETAILS_FALLBACK: ClubApprovalMeetingSchedule = {
  meetingDay: 'To be announced',
  meetingTime: '—',
  location: 'Meeting details will be shared soon.',
};

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

export function getClubApprovalMeetingSchedule(
  clubId?: string | null,
  clubName?: string | null
): ClubApprovalMeetingSchedule {
  const resolvedId = resolveClubId(clubId, clubName);
  if (resolvedId && CLUB_APPROVAL_FIRST_MEETING_DETAILS[resolvedId]) {
    return CLUB_APPROVAL_FIRST_MEETING_DETAILS[resolvedId];
  }
  return APPROVAL_MEETING_DETAILS_FALLBACK;
}
