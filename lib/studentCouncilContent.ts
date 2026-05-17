import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Megaphone, Users } from 'lucide-react'

export const STUDENT_COUNCIL_TAGLINE =
  'Representing student voices and improving school life at ANS.'

export const STUDENT_COUNCIL_INTRO =
  'Student Council represents student voices across ANS. Members help organize school events, share feedback with teachers and leadership, and support projects that improve student life. It is a place for students who want to take responsibility, communicate clearly, and help turn ideas into action.'

export const STUDENT_COUNCIL_PILLARS = [
  { label: 'Student Voice', icon: Megaphone },
  { label: 'School Events', icon: CalendarDays },
  { label: 'Leadership & Service', icon: Users },
] as const

export const STUDENT_COUNCIL_DOES: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: 'Student feedback',
    body: 'Represents student feedback and ideas from year groups and houses.',
    icon: Megaphone,
  },
  {
    title: 'Events & campaigns',
    body: 'Plans school events and campaigns—from booking and publicity to roles on the day.',
    icon: CalendarDays,
  },
  {
    title: 'Staff liaison',
    body: 'Works with teachers and school leadership when something needs action at school level.',
    icon: Users,
  },
]

export const ANS_HOUSES = [
  { id: 'padhavi', name: 'Padhavi', color: '#22c55e', colorMuted: 'rgba(34, 197, 94, 0.2)' },
  { id: 'dehjo', name: 'Dehjo', color: '#ef4444', colorMuted: 'rgba(239, 68, 68, 0.2)' },
  { id: 'nadhi', name: 'Nadhi', color: '#3b82f6', colorMuted: 'rgba(59, 130, 246, 0.2)' },
  { id: 'whayu', name: 'Whayu', color: '#eab308', colorMuted: 'rgba(234, 179, 8, 0.2)' },
] as const

export const STUDENT_COUNCIL_YEAR_GROUPS = [7, 8, 9, 10, 11, 12, 13] as const

export const STUDENT_COUNCIL_REP_STRUCTURE =
  'Each year group (Y7–Y13) has four Student Council reps—one chosen from each house. That way every year and every house has a voice on Council.'
