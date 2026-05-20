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
