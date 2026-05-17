'use client'

import { StudentCouncilHouseSelection } from '@/components/clubs/StudentCouncilHouseSelection'
import { STUDENT_COUNCIL_DOES, STUDENT_COUNCIL_INTRO } from '@/lib/studentCouncilContent'
import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

type StudentCouncilDetailProps = {
  tintHex: string
}

function SectionHeading({ children, tintHex }: { children: React.ReactNode; tintHex: string }) {
  return (
    <h2
      className="text-sm font-bold text-white mb-3 tracking-tight"
      style={{ borderLeft: `3px solid ${tintHex}`, paddingLeft: 8 }}
    >
      {children}
    </h2>
  )
}

function IconTile({
  icon: Icon,
  tintHex,
  className,
}: {
  icon: LucideIcon
  tintHex: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
        className
      )}
      style={{
        borderColor: `${tintHex}40`,
        backgroundColor: `${tintHex}14`,
        color: tintHex,
      }}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
    </span>
  )
}

export function StudentCouncilDetail({ tintHex }: StudentCouncilDetailProps) {
  return (
    <div className="space-y-8 mb-5">
      <div>
        <SectionHeading tintHex={tintHex}>About the Council</SectionHeading>
        <p className="text-white/80 text-sm leading-relaxed max-w-3xl" style={{ lineHeight: 1.6 }}>
          {STUDENT_COUNCIL_INTRO}
        </p>
      </div>

      <div>
        <SectionHeading tintHex={tintHex}>What Student Council does</SectionHeading>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STUDENT_COUNCIL_DOES.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex gap-3"
            >
              <IconTile icon={item.icon} tintHex={tintHex} />
              <div className="min-w-0">
                <p className="text-white font-medium text-sm">{item.title}</p>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <StudentCouncilHouseSelection tintHex={tintHex} />
    </div>
  )
}
