/** Stage crew team preferences (Google Form parity). */
export const STAGE_CREW_TEAM_OPTIONS = [
  'Props and Set',
  'Snacks and Refreshments',
  'Merchandise',
  'Tickets',
  'Lighting and Sound',
] as const

export type StageCrewTeam = (typeof STAGE_CREW_TEAM_OPTIONS)[number]

/** Shown in the “application received” email for School Show Stage Crew only. */
export const SCHOOL_SHOW_STAGE_CREW_EMAIL_DISCLAIMER = `Important Disclaimer

Completing this application does not guarantee selection into the School Show Stage Crew.
Applications will be reviewed by the leadership team. Final results will be sent via email by 29 May 2026.`

/** Optional future form fields (e.g. interview slot). Video link uses `video_submission` in responses JSON. */
export const SCHOOL_SHOW_STAGE_CREW_FUTURE_FIELD_KEYS = ['interview_slot'] as const

export type SchoolShowNoticeItem = {
  label?: string
  text: string
}

export type SchoolShowNoticeSection = {
  title: string
  items: SchoolShowNoticeItem[]
}

/** Structured copy for Stage Crew special notices (club page + apply form). */
export const SCHOOL_SHOW_STAGE_CREW_NOTICE_SECTIONS: SchoolShowNoticeSection[] = [
  {
    title: 'About this application',
    items: [
      {
        text: 'This form is for School Show Stage Crew only — backstage and production teams (props, refreshments, merchandise, tickets, lighting, and sound).',
      },
      {
        label: 'Cast & performers',
        text: 'Filled through separate auditions, not this form.',
      },
      {
        text: 'Applications are reviewed by the leadership team. Submitting does not guarantee selection.',
      },
    ],
  },
  {
    title: 'How to join School Show (by role)',
    items: [
      {
        text: 'Participation is by audition or application, depending on your role.',
      },
      {
        label: 'Cast & dancers',
        text: 'Audition in week 3 of term 1.1.',
      },
      {
        label: 'Stage Crew',
        text: 'Apply using this form on ANSxtra.',
      },
      {
        label: 'Student directors',
        text: 'Separate application process and interview.',
      },
    ],
  },
  {
    title: 'Commitment & rehearsals',
    items: [
      {
        text: 'Students are expected to show commitment, good attendance, and the ability to work collaboratively.',
      },
      {
        text: 'Additional rehearsals are compulsory during the rehearsal and performance period.',
      },
    ],
  },
]
