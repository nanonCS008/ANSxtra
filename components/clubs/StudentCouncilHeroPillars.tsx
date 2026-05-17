'use client'

import { STUDENT_COUNCIL_PILLARS, STUDENT_COUNCIL_TAGLINE } from '@/lib/studentCouncilContent'
import { cn } from '@/lib/utils/cn'

type StudentCouncilHeroPillarsProps = {
  tintHex: string
  className?: string
}

export function StudentCouncilHeroPillars({ tintHex, className }: StudentCouncilHeroPillarsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-white/75 text-sm md:text-base max-w-xl leading-relaxed">
        {STUDENT_COUNCIL_TAGLINE}
      </p>
      <div className="flex flex-wrap gap-2">
        {STUDENT_COUNCIL_PILLARS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-sm"
            style={{
              borderColor: `${tintHex}45`,
              backgroundColor: `${tintHex}18`,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: tintHex }} strokeWidth={2} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
