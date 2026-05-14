import type { ReactNode } from 'react'

export type FieldKind = 'text' | 'textarea' | 'date' | 'radio' | 'checkbox' | 'checkboxGroup'

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
    { key: 'name', kind: 'text', label: 'Name', required: false },
    { key: 'year_group', kind: 'text', label: 'Year group', required: false },
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
    { key: 'name', kind: 'text', label: 'Name', required: false },
    { key: 'year', kind: 'text', label: 'Year', required: false },
    { key: 'why_join', kind: 'textarea', label: 'Why do they want to join the Interact Club', required: true, minLength: 5 },
    {
      key: 'which_roles',
      kind: 'checkboxGroup',
      label: 'Which roles (e.g. Finance events social media) would they like to be a part of?',
      required: true,
      options: ['Finance', 'Events', 'Social Media'],
    },
  ],
  'eco-committee': [
    { key: 'name', kind: 'text', label: 'Name', required: false },
    { key: 'year_group', kind: 'text', label: 'Year group', required: false },
    { key: 'why_join', kind: 'textarea', label: 'Why do they want to join the eco committee', required: true, minLength: 5 },
    { key: 'how_will_joining_affect_you', kind: 'textarea', label: 'How will joining this club affect them as an individual?', required: true, minLength: 5 },
  ],
  'duke-of-edinburgh': [
    {
      key: 'award_level',
      kind: 'radio',
      label: 'Which Award level are you applying for (Bronze / Silver / Gold)?',
      required: true,
      options: ['Bronze', 'Silver', 'Gold'],
    },
    { key: 'date_of_birth', kind: 'date', label: 'Date of birth (to confirm age eligibility)', required: true },
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
    { key: 'name', kind: 'text', label: 'Name', required: false },
    { key: 'year_group', kind: 'text', label: 'Year Group', required: false },
    { key: 'house', kind: 'text', label: 'House', required: true },
    {
      key: 'which_group',
      kind: 'checkboxGroup',
      label: 'Which group they want to join within UNICEF (Event team and Graphics design team)',
      required: true,
      options: ['Event team', 'Graphics design team'],
    },
  ],
  tedx: [
    {
      key: 'describe_talk_learned',
      kind: 'textarea',
      label: 'Choose one TEDx Amnuay Silpa School Youth talk to watch and describe what you learned from the talk',
      required: true,
      minLength: 5,
    },
    { key: 'interests_passions_abilities', kind: 'textarea', label: 'Interests passions and abilities', required: true, minLength: 5 },
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
export function formatApplicationResponsesForExport(responses: unknown, clubId: string): string {
  if (responses == null) return ''
  if (typeof responses === 'string') return responses.trim()
  if (typeof responses !== 'object') return String(responses)
  if (Array.isArray(responses)) return JSON.stringify(responses)

  const o = responses as Record<string, unknown>
  const fields = getClubFormFields(clubId)
  const labelByKey = new Map(fields.map((f) => [f.key, f.label]))
  const orderedKeys = fields.map((f) => f.key)
  const present = new Set(Object.keys(o))
  const orderedPresent = orderedKeys.filter((k) => present.has(k))
  const extraKeys = [...present].filter((k) => !orderedKeys.includes(k)).sort()
  const keys = [...orderedPresent, ...extraKeys]

  return keys
    .map((key) => {
      const label = labelByKey.get(key) ?? humanizeResponseKey(key)
      return `${label}: ${formatResponseValue(o[key])}`
    })
    .join('\n')
}

