'use client'

import { cn } from '@/lib/utils/cn'
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-white/90 mb-2">
            {label}
            {props.required && <span className="text-brand-pink ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full min-h-[44px] px-4 py-3 rounded-xl',
            'bg-brand-navy/80 border border-white/10',
            'text-white placeholder:text-white/40',
            'focus:outline-none focus:border-brand-pink/50 focus:ring-2 focus:ring-brand-pink/20',
            'transition-all duration-200',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-2 text-sm text-white/50">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-white/90 mb-2">
            {label}
            {props.required && <span className="text-brand-pink ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className={cn(
            'w-full min-h-[100px] px-4 py-3 rounded-xl resize-y',
            'bg-brand-navy/80 border border-white/10',
            'text-white placeholder:text-white/40',
            'focus:outline-none focus:border-brand-pink/50 focus:ring-2 focus:ring-brand-pink/20',
            'transition-all duration-200',
            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-2 text-sm text-white/50">{helperText}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

