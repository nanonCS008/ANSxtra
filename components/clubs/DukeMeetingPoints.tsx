'use client'

import { DOE_THEMES } from '@/lib/doeThemes'
import { cn } from '@/lib/utils/cn'

const MEETING_POINTS = [
  { level: 'Bronze', room: '3-101', theme: DOE_THEMES.bronze },
  { level: 'Silver', room: '14-101', theme: DOE_THEMES.silver },
  { level: 'Gold', room: '14-102', theme: DOE_THEMES.gold },
] as const

type DukeMeetingPointsProps = {
  accentHex: string
  variant?: 'card' | 'notice'
  className?: string
}

export function DukeMeetingPoints({ accentHex, variant = 'card', className }: DukeMeetingPointsProps) {
  if (variant === 'notice') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3',
          className
        )}
        style={{
          borderColor: `${accentHex}44`,
          backgroundColor: `${accentHex}12`,
          boxShadow: `inset 0 1px 0 ${accentHex}22`,
        }}
        role="note"
        aria-label="Meeting points notice for existing Duke of Edinburgh members"
      >
        <div className="flex items-start gap-2.5 sm:min-w-[200px] sm:max-w-[240px]">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: `${accentHex}28`, color: accentHex }}
            aria-hidden
          >
            !
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">Notice — existing members</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/60">
              Not for new applicants.
            </p>
          </div>
        </div>
        <p className="text-xs text-white/75 sm:border-l sm:border-white/10 sm:pl-4">
          <span className="font-medium text-white/90">Friday 22 May – Period 6</span>
        </p>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0 sm:ml-auto">
          {MEETING_POINTS.map(({ level, room, theme }) => (
            <li
              key={level}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5"
              style={{ borderLeftWidth: 2, borderLeftColor: theme.accent }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.accent }}>
                {level}
              </span>
              <span className="font-mono text-sm font-semibold text-white tabular-nums">{room}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div
      className={cn('rounded-xl border bg-white/[0.04] backdrop-blur-sm p-3.5 sm:p-4', className)}
      style={{
        borderColor: `${accentHex}55`,
        borderLeftWidth: 3,
        borderLeftColor: accentHex,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
      role="note"
      aria-label="Duke of Edinburgh meeting points for existing members"
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-sm font-semibold text-white">Meeting points</p>
        <p className="text-xs text-white/55">Existing members only</p>
      </div>
      <p className="mb-3 text-xs text-white/75">
        <span className="font-medium text-white/90">Friday 22 May – Period 6</span>
      </p>
      <p className="mb-3 text-[11px] text-white/60">
        For current Bronze, Silver, and Gold participants and award leaders—not new applicants.
      </p>
      <ul className="grid gap-2 sm:grid-cols-3 list-none p-0 m-0">
        {MEETING_POINTS.map(({ level, room, theme }) => (
          <li
            key={level}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 sm:flex-col sm:items-start sm:py-2.5"
            style={{ borderLeftWidth: 2, borderLeftColor: theme.accent }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.accent }}>
              {level}
            </span>
            <span className="font-mono text-base font-semibold text-white tabular-nums">{room}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
