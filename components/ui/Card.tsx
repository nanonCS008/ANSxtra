'use client'

import { cn } from '@/lib/utils/cn'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, hover = false, padding = 'md' }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-brand-navy/60 backdrop-blur-sm rounded-2xl border border-white/10',
        'shadow-card',
        hover && 'cursor-pointer hover:border-brand-pink/30 hover:shadow-card-hover',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-6',
        padding === 'lg' && 'p-8',
        padding === 'none' && 'p-0',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

