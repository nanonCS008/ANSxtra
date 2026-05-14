'use client'

import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'pink' | 'purple' | 'blue' | 'success' | 'warning'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        // Sizes
        size === 'sm' && 'px-2.5 py-1 text-xs',
        size === 'md' && 'px-3 py-1.5 text-sm',
        // Variants
        variant === 'default' && 'bg-white/10 text-white/80',
        variant === 'pink' && 'bg-brand-pink/20 text-brand-pink',
        variant === 'purple' && 'bg-brand-purple/20 text-brand-purple',
        variant === 'blue' && 'bg-brand-blue/20 text-brand-blue',
        variant === 'success' && 'bg-emerald-500/20 text-emerald-400',
        variant === 'warning' && 'bg-amber-500/20 text-amber-400',
        className
      )}
    >
      {children}
    </span>
  )
}

