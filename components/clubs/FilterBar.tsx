'use client'

import { cn } from '@/lib/utils/cn'
import { motion } from 'framer-motion'

export type YearGroupFilter = 'all' | 7 | 8 | 9 | 10 | 11 | 12 | 13

interface FilterBarProps {
  yearGroupFilter: YearGroupFilter
  onYearGroupFilterChange: (value: YearGroupFilter) => void
}

const YEAR_OPTIONS: { value: YearGroupFilter; label: string }[] = [
  { value: 'all', label: 'All years' },
  { value: 7, label: 'Y7' },
  { value: 8, label: 'Y8' },
  { value: 9, label: 'Y9' },
  { value: 10, label: 'Y10' },
  { value: 11, label: 'Y11' },
  { value: 12, label: 'Y12' },
  { value: 13, label: 'Y13' },
]

export function FilterBar({
  yearGroupFilter,
  onYearGroupFilterChange,
}: FilterBarProps) {
  const hasSelection = yearGroupFilter !== 'all'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border px-4 py-2.5 transition-all duration-300 inline-flex flex-col',
        'bg-brand-navy/60 backdrop-blur-sm',
        hasSelection ? 'border-white/10' : 'border-brand-pink/30 shadow-[0_0_20px_-4px_rgba(217,70,239,0.25)]'
      )}
    >
      <label className="block text-white/60 text-xs uppercase tracking-wider font-medium mb-1.5">
        Year group
      </label>
      <select
        value={yearGroupFilter === 'all' ? 'all' : yearGroupFilter}
        onChange={(e) => {
          const v = e.target.value
          onYearGroupFilterChange(v === 'all' ? 'all' : (Number(v) as YearGroupFilter))
        }}
        className={cn(
          'min-h-[40px] pl-3 pr-9 py-2 rounded-lg appearance-none cursor-pointer font-medium text-sm text-white',
          'bg-brand-deep/60 border w-full min-w-[120px]',
          'focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink/50',
          'transition-all duration-200',
          hasSelection ? 'border-white/15' : 'border-brand-pink/40'
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '18px',
        }}
      >
        {YEAR_OPTIONS.map((opt) => (
          <option key={String(opt.value)} value={opt.value === 'all' ? 'all' : opt.value} className="bg-brand-navy">
            {opt.label}
          </option>
        ))}
      </select>
    </motion.div>
  )
}
