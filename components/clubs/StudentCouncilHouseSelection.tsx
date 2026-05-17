'use client'

import {
  ANS_HOUSES,
  STUDENT_COUNCIL_REP_STRUCTURE,
  STUDENT_COUNCIL_YEAR_GROUPS,
} from '@/lib/studentCouncilContent'
import { cn } from '@/lib/utils/cn'
import { Fragment } from 'react'

type StudentCouncilHouseSelectionProps = {
  className?: string
  tintHex?: string
}

export function StudentCouncilHouseSelection({
  className,
  tintHex = '#a78bfa',
}: StudentCouncilHouseSelectionProps) {
  const seatCount = STUDENT_COUNCIL_YEAR_GROUPS.length * ANS_HOUSES.length

  return (
    <section className={cn('rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <h3
          className="text-sm font-bold text-white tracking-tight"
          style={{ borderLeft: `3px solid ${tintHex}`, paddingLeft: 8 }}
        >
          Council structure
        </h3>
        <span
          className="text-[11px] font-medium tabular-nums rounded-full border px-2.5 py-0.5"
          style={{ borderColor: `${tintHex}40`, color: `${tintHex}cc` }}
        >
          {seatCount} reps across ANS
        </span>
      </div>
      <p className="text-white/65 text-xs md:text-sm leading-relaxed mb-5 max-w-2xl">
        {STUDENT_COUNCIL_REP_STRUCTURE}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ANS_HOUSES.map((house) => (
          <div
            key={house.id}
            className="relative overflow-hidden rounded-xl border p-4 text-center h-full"
            style={{
              borderColor: `${house.color}55`,
              background: `linear-gradient(160deg, ${house.colorMuted} 0%, rgba(11,16,32,0.4) 70%)`,
            }}
          >
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full"
              style={{ backgroundColor: house.color }}
              aria-hidden
            />
            <p className="text-white font-semibold text-sm tracking-wide">{house.name}</p>
            <p className="text-white/50 text-[10px] uppercase tracking-wider mt-1">House</p>
            <div
              className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20 blur-md"
              style={{ backgroundColor: house.color }}
              aria-hidden
            />
          </div>
        ))}
      </div>

      <p className="text-white/45 text-[11px] mb-3 uppercase tracking-wide font-medium">
        One rep per house, per year group
      </p>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="min-w-[320px]">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `3.5rem repeat(${ANS_HOUSES.length}, 1fr)` }}
          >
            <div aria-hidden />
            {ANS_HOUSES.map((house) => (
              <div
                key={house.id}
                className="text-center text-[10px] font-semibold truncate px-0.5"
                style={{ color: house.color }}
              >
                {house.name}
              </div>
            ))}

            {STUDENT_COUNCIL_YEAR_GROUPS.map((year) => (
              <YearRow key={year} year={year} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-white/40 text-[11px] mt-4 leading-relaxed">
        Each coloured slot is one Council seat for that year and house. Selection is run through your
        house and year—contact Mr Delaney for how to put yourself forward.
      </p>
    </section>
  )
}

function YearRow({ year }: { year: number }) {
  return (
    <Fragment>
      <div className="flex items-center justify-end pr-2 text-xs font-medium text-white/70">Y{year}</div>
      {ANS_HOUSES.map((house) => (
        <div
          key={`${year}-${house.id}`}
          className="flex items-center justify-center rounded-md border py-2 min-h-[36px]"
          style={{
            borderColor: `${house.color}40`,
            backgroundColor: house.colorMuted,
          }}
          title={`Year ${year} — ${house.name} rep`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-white/20"
            style={{ backgroundColor: house.color }}
            aria-hidden
          />
          <span className="sr-only">
            Year {year}, {house.name} representative
          </span>
        </div>
      ))}
    </Fragment>
  )
}
