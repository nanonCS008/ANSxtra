'use client'

import { cn } from '@/lib/utils/cn'

interface RadioOption {
  value: string
  label: string
}

interface RadioGroupProps {
  label: string
  name: string
  options: RadioOption[]
  value?: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}

export function RadioGroup({ label, name, options, value, onChange, error, required }: RadioGroupProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-white/90 mb-3">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center min-h-[44px] px-4 py-3 rounded-xl cursor-pointer',
              'bg-brand-navy/60 border border-white/10',
              'transition-all duration-200',
              'hover:border-white/20 hover:bg-brand-navy/80',
              value === option.value && 'border-brand-pink/50 bg-brand-pink/10'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center',
                'transition-all duration-200',
                value === option.value
                  ? 'border-brand-pink bg-brand-pink'
                  : 'border-white/30'
              )}
            >
              {value === option.value && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </span>
            <span className="text-white/90">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}

