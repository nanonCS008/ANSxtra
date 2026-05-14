'use client'

import { Club } from '@/lib/types/club'
import { motion } from 'framer-motion'
import { ClubCard } from './ClubCard'

interface ClubGridProps {
  clubs: Club[]
  appliedClubIds?: Set<string>
  /** When signed-in but school profile is missing / not recognized — show access message instead of filter hint. */
  emptyState?: 'no_matches' | 'invalid_student'
}

export function ClubGrid({ clubs, appliedClubIds, emptyState = 'no_matches' }: ClubGridProps) {
  if (clubs.length === 0) {
    const isInvalidStudent = emptyState === 'invalid_student'
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-navy/60 flex items-center justify-center">
          <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {isInvalidStudent ? (
          <p className="text-white/80 text-base max-w-md mx-auto leading-relaxed">
            You are not in a valid Amnuaysilpa{' '}
            <span className="underline underline-offset-2 decoration-white/50">student</span> account.
          </p>
        ) : (
          <>
            <h3 className="text-xl font-semibold text-white mb-2">No clubs found</h3>
            <p className="text-white/60">Try selecting a different year group.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {clubs.map((club, index) => (
        <motion.div
          key={club.id}
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.03 }}
        >
          <ClubCard 
            club={club} 
            compact 
            applied={appliedClubIds?.has(club.id) || false}
          />
        </motion.div>
      ))}
    </div>
  )
}
