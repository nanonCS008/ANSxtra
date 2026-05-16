import type { ReactNode } from 'react'

import { formatDobIsoForDisplay } from '@/lib/dmyDate'

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'dmyDate'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'

export type FieldDef = {
  key: string
  kind: FieldKind
  label: string
  required: boolean
  options?: string[]
  minLength?: number
  helper?: ReactNode
  placeholder?: string
}

/**
 * Form field definitions derived from `ANSxtra BACK/backend/club_question_labels.csv`.
 * Club IDs are the frontend slugs (kebab-case).
 */
const FIELDS_BY_CLUB: Record<string, FieldDef[]> = {
  'operation-smile': [
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join Operation Smile?', required: true, minLength: 5 },
  ],
  'school-show': [
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join the School Show?', required: true, minLength: 5 },
  ],
  'spark-club': [
    { key: 'old_new_member', kind: 'radio', label: 'Old member / new member', required: true, options: ['Old member', 'New member'] },
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join SPARK club / your expectations of the club', required: true, minLength: 5 },
    {
      key: 'field_of_interests',
      kind: 'checkboxGroup',
      label: 'Field of interests (sports arts media science pr etc.)',
      required: true,
      options: ['Sports', 'Arts & Design', 'Media / Content', 'Science & Tech', 'PR / Marketing', 'Other'],
    },
    { key: 'field_of_interests_other', kind: 'text', label: 'Other (please specify)', required: false, placeholder: 'Type your field of interest...' },
  ],
  'interact-club': [
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join the Interact Club?', required: true, minLength: 5 },
    {
      key: 'which_roles',
      kind: 'checkboxGroup',
      label: 'Which sectors are you interested in joining? (Able to select many)',
      required: true,
      options: [
        'Treasurer',
        'Secretary',
        'Coordinators',
        'Public Relations',
        'Fundraising / events',
        'Operators',
      ],
    },
  ],
  'eco-committee': [
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join the Eco Committee?', required: true, minLength: 5 },
    { key: 'how_will_joining_affect_you', kind: 'textarea', label: 'How will joining this club affect you as an individual?', required: true, minLength: 5 },
  ],
  'duke-of-edinburgh': [
    {
      key: 'award_level',
      kind: 'radio',
      label: 'Which Award level are you applying for (Bronze / Silver / Gold)?',
      required: true,
      options: ['Bronze', 'Silver', 'Gold'],
    },
    {
      key: 'date_of_birth',
      kind: 'dmyDate',
      label: 'Date of birth (to confirm age eligibility)',
      required: true,
    },
    { key: 'why_join', kind: 'textarea', label: 'Why do you want to join the DofE International Award?', required: true, minLength: 5 },
    { key: 'previous_dofe', kind: 'textarea', label: 'Have you previously completed any level of the DofE Award? (If yes please specify)', required: true, minLength: 2 },
    {
      key: 'willing_to_commit',
      kind: 'radio',
      label: 'Are you willing to commit time weekly to Volunteering Physical and Skills sections?',
      required: true,
      options: ['Yes', 'No'],
    },
    { key: 'medical_conditions', kind: 'textarea', label: 'Do you have any medical conditions or considerations we should be aware of?', required: true, minLength: 2 },
  ],
  'unicef-ambassador': [
    {
      key: 'which_group',
      kind: 'checkboxGroup',
      label: 'Which group do you want to join within UNICEF? (Event team and Graphics design team)',
      required: true,
      options: ['Event team', 'Graphics design team'],
    },
  ],
  'student-council': [
    {
      key: 'why_join',
      kind: 'textarea',
      label: 'Why do you want to join the Student Council?',
      required: true,
      minLength: 5,
    },
    {
      key: 'qualities_fit',
      kind: 'textarea',
      label: 'What qualities do you have that would make you a good Student Council member?',
      required: true,
      minLength: 5,
    },
    {
      key: 'leadership_teamwork_example',
      kind: 'textarea',
      label: 'Describe a time when you demonstrated leadership or teamwork:',
      required: true,
      minLength: 5,
    },
    {
      key: 'school_improvement_ideas',
      kind: 'textarea',
      label: 'What ideas do you have for improving our school?',
      required: true,
      minLength: 5,
    },
  ],
  'enterprise-club': [],
  tedx: [
    {
      key: 'describe_talk_learned',
      kind: 'textarea',
      label: 'Choose one TEDx Amnuay Silpa School Youth talk to watch and describe what you learned from the talk',
      required: true,
      minLength: 5,
    },
    { key: 'interests_passions_abilities', kind: 'textarea', label: 'What are your interests, hobbies, and passions?', required: true, minLength: 5 },
  ],
}

export function getClubFormFields(clubId: string): FieldDef[] {
  return FIELDS_BY_CLUB[clubId] ?? []
}

function humanizeResponseKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function formatResponseValue(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'object' && !Array.isArray(val)) return JSON.stringify(val)
  if (Array.isArray(val)) return val.map((v) => String(v)).join(', ')
  return String(val)
}

/**
 * Human-readable answers for exports (CSV), using the same question labels as the join form
 * (`club_question_labels.csv` / `getClubFormFields`). Unknown keys fall back to Title Case from the key.
 */
function parseResponsesObject(responses: unknown): Record<string, unknown> | null {
  if (responses == null) return null
  if (typeof responses === 'string') {
    const trimmed = responses.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
    return null
  }
  if (typeof responses !== 'object' || Array.isArray(responses)) return null
  return responses as Record<string, unknown>
}

function orderedResponseKeys(o: Record<string, unknown>, clubId: string): string[] {
  const fields = getClubFormFields(clubId)
  const orderedKeys = fields.map((f) => f.key)
  const present = new Set(Object.keys(o))
  const orderedPresent = orderedKeys.filter((k) => present.has(k))
  const extraKeys = [...present].filter((k) => !orderedKeys.includes(k)).sort()
  return [...orderedPresent, ...extraKeys]
}

function formatResponseForStudentEmail(val: unknown, field?: FieldDef): string {
  if (val == null || val === '') return '—'
  if (field?.kind === 'checkbox') {
    const s = String(val).toLowerCase()
    const yes = val === true || s === 'true' || s === '1' || s === 'yes'
    return yes ? 'Yes' : 'No'
  }
  if (field?.kind === 'dmyDate' || field?.kind === 'date') {
    const t = typeof val === 'string' ? val.trim() : ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const formatted = formatDobIsoForDisplay(t)
      if (field.kind === 'dmyDate') return `${formatted} (CE)`
      return formatted
    }
  }
  if (typeof val === 'string') {
    const t = val.trim()
    if (t.startsWith('[') && t.endsWith(']')) {
      try {
        const p = JSON.parse(t) as unknown
        if (Array.isArray(p)) return p.map((x) => String(x)).join(', ')
      } catch {
        /* fall through */
      }
    }
  }
  if (Array.isArray(val)) return val.map((x) => String(x)).join(', ')
  return formatResponseValue(val)
}

export type ApplicationResponseDisplayRow = {
  label: string
  value: string
}

/**
 * Question/answer pairs for student-facing confirmation emails, using the same labels as the join form.
 */
export function getApplicationResponseDisplayRows(
  responses: unknown,
  clubId: string
): ApplicationResponseDisplayRow[] {
  const o = parseResponsesObject(responses)
  if (!o) return []

  const fields = getClubFormFields(clubId)
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]))
  const fieldByKey = new Map(fields.map((f) => [f.key, f]))
  const keys = orderedResponseKeys(o, clubId)

  return keys.map((key) => ({
    label: labelByKey.get(key) ?? humanizeResponseKey(key),
    value: formatResponseForStudentEmail(o[key], fieldByKey.get(key)),
  }))
}

/** Question columns for a single-club CSV (header = full join-form label). */
export function getQuestionColumnsForClub(clubId: string): { key: string; label: string }[] {
  return getClubFormFields(clubId).map((f) => ({ key: f.key, label: f.label }))
}

export function getResponseValueForExport(responses: unknown, clubId: string, key: string): string {
  const o = parseResponsesObject(responses)
  if (!o || !(key in o)) return ''
  const field = getClubFormFields(clubId).find((f) => f.key === key)
  if (field?.kind === 'dmyDate' && typeof o[key] === 'string') {
    const t = o[key].trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${formatDobIsoForDisplay(t)} (CE)`
  }
  return formatResponseValue(o[key])
}

export function formatApplicationResponsesForExport(responses: unknown, clubId: string): string {
  if (responses == null) return ''
  if (typeof responses === 'string') {
    const trimmed = responses.trim()
    if (!trimmed) return ''
    const parsed = parseResponsesObject(trimmed)
    if (parsed) return formatApplicationResponsesForExport(parsed, clubId)
    return trimmed
  }
  if (typeof responses !== 'object') return String(responses)
  if (Array.isArray(responses)) return JSON.stringify(responses)

  const o = responses as Record<string, unknown>
  const fields = getClubFormFields(clubId)
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]))
  const keys = orderedResponseKeys(o, clubId)

  return keys
    .map((key) => {
      const label = labelByKey.get(key) ?? humanizeResponseKey(key)
      return `${label}: ${getResponseValueForExport(o, clubId, key)}`
    })
    .join('\n')
}

