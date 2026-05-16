'use client'

import { parseStoredDobIso } from '@/lib/dmyDate'
import { cn } from '@/lib/utils/cn'
import { useCallback, useEffect, useMemo, useState } from 'react'

const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function parseIso(iso: string): { d: number; m: number; y: number } | null {
  return parseStoredDobIso(iso)
}

function toIso(d: number, m: number, y: number): string {
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
    return ''
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const selectClass = cn(
  'w-full min-h-[44px] px-3 py-2.5 rounded-xl',
  'bg-brand-navy/80 border border-white/10',
  'text-white text-sm',
  'focus:outline-none focus:border-brand-pink/50 focus:ring-2 focus:ring-brand-pink/20',
  'transition-all duration-200',
  '[color-scheme:dark]'
)

type Parts = { d: number | null; m: number | null; y: number | null }

type DmyDateFieldProps = {
  fieldKey: string
  label: string
  required?: boolean
  value: string
  onChange: (iso: string) => void
  onBlur: () => void
  error?: string
}

/**
 * Day → month → year (Thai convention), stored as ISO `YYYY-MM-DD`.
 * Years are Western / CE (ค.ศ.) — list updates with the calendar year automatically.
 */
export function DmyDateField({
  fieldKey,
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
}: DmyDateFieldProps) {
  const [parts, setParts] = useState<Parts>({ d: null, m: null, y: null })

  // Sync down from parent when we get a full ISO (e.g. reload); do not clear partial edits when parent is still ''.
  useEffect(() => {
    const p = parseIso(value)
    if (p) setParts({ d: p.d, m: p.m, y: p.y })
  }, [value])

  const currentYear = new Date().getFullYear()
  const minBirthYear = currentYear - 22
  const maxBirthYear = currentYear - 9
  const years = useMemo(() => {
    const list: number[] = []
    for (let yr = maxBirthYear; yr >= minBirthYear; yr--) list.push(yr)
    return list
  }, [minBirthYear, maxBirthYear])

  const d = parts.d
  const m = parts.m
  const y = parts.y

  const maxDay = m != null && y != null ? daysInMonth(m, y) : 31
  const days = useMemo(() => {
    return Array.from({ length: maxDay }, (_, i) => i + 1)
  }, [maxDay])

  const commit = useCallback(
    (patch: Partial<Parts>) => {
      setParts((prev) => {
        let d = patch.d !== undefined ? patch.d : prev.d
        let m = patch.m !== undefined ? patch.m : prev.m
        let y = patch.y !== undefined ? patch.y : prev.y
        if (m != null && y != null && d != null) {
          const dim = daysInMonth(m, y)
          if (d > dim) d = dim
        }
        const n: Parts = { d, m, y }
        const iso = n.d != null && n.m != null && n.y != null ? toIso(n.d, n.m, n.y) : ''
        onChange(iso)
        return n
      })
    },
    [onChange]
  )

  return (
    <div className="w-full">
      <fieldset className="min-w-0">
        <legend className="block text-sm font-medium text-white/90 mb-1.5">
          {label}
          {required && <span className="text-brand-pink ml-1">*</span>}
        </legend>
        <p className="text-white/45 text-xs mb-2.5 leading-relaxed">
          Choose in order: <span className="text-white/65">day → month → year</span>. Use the{' '}
          <strong className="text-white/80">Western (CE / ค.ศ.)</strong> year — e.g.{' '}
          <span className="text-white/70">{currentYear - 15}</span> for a ~15-year-old in {currentYear}.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="min-w-0 flex flex-col gap-1">
            <label htmlFor={`${fieldKey}-day`} className="text-[10px] uppercase tracking-wide text-white/40">
              Day
            </label>
            <select
              id={`${fieldKey}-day`}
              value={d != null && d >= 1 && d <= maxDay ? String(d) : ''}
              onBlur={onBlur}
              onChange={(e) => {
                const raw = e.target.value
                if (!raw) {
                  commit({ d: null })
                  return
                }
                commit({ d: parseInt(raw, 10) })
              }}
              className={cn(selectClass, error && 'border-red-500/50')}
              aria-invalid={!!error}
            >
              <option value="">Day</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <label htmlFor={`${fieldKey}-month`} className="text-[10px] uppercase tracking-wide text-white/40">
              Month
            </label>
            <select
              id={`${fieldKey}-month`}
              value={m != null ? String(m) : ''}
              onBlur={onBlur}
              onChange={(e) => {
                const raw = e.target.value
                if (!raw) {
                  commit({ m: null })
                  return
                }
                commit({ m: parseInt(raw, 10) })
              }}
              className={cn(selectClass, error && 'border-red-500/50')}
              aria-invalid={!!error}
            >
              <option value="">Month</option>
              {MONTHS.map((mo) => (
                <option key={mo.value} value={mo.value}>
                  {mo.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <label htmlFor={`${fieldKey}-year`} className="text-[10px] uppercase tracking-wide text-white/40">
              Year (CE)
            </label>
            <select
              id={`${fieldKey}-year`}
              value={y != null ? String(y) : ''}
              onBlur={onBlur}
              onChange={(e) => {
                const raw = e.target.value
                if (!raw) {
                  commit({ y: null })
                  return
                }
                commit({ y: parseInt(raw, 10) })
              }}
              className={cn(selectClass, error && 'border-red-500/50')}
              aria-invalid={!!error}
            >
              <option value="">Year</option>
              {years.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
