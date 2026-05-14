'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const clubName = searchParams.get('club') || 'the club'
  const studentId = searchParams.get('studentId') || ''

  return (
    <div className="min-h-screen overflow-x-hidden py-10 sm:py-12 flex items-center">
      <Container size="narrow" className="min-w-0 max-w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-white mb-2"
          >
            Application received
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-base text-white/70 mb-5"
          >
            Your application for <span className="text-white font-semibold">{clubName}</span> has been submitted for review.
          </motion.p>

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card padding="lg" className="text-left mb-4">
              <h2 className="text-base font-bold text-white mb-3">Application Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/10 gap-4">
                  <span className="text-white/60">Club</span>
                  <span className="text-white font-medium text-right">{clubName}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/10 gap-4">
                  <span className="text-white/60">Student ID</span>
                  <span className="text-white font-medium text-right">{studentId}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* What's next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card padding="lg" className="text-left mb-5 border-brand-blue/30 bg-brand-blue/10">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-blue/20 flex items-center justify-center text-brand-blue flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">What's Next?</h3>
                  <p className="text-white/70 text-sm">
                    Club Leaders will review your application. You can track status anytime in “My Applications”.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button href="/my-applications" size="lg">My Applications</Button>
            <Button href="/clubs" variant="secondary" size="lg">Browse Clubs</Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="pt-24 pb-16 min-h-screen">
        <Container size="narrow">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-brand-navy/60 animate-pulse" />
            <div className="h-10 w-48 mx-auto bg-brand-navy/60 rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-64 mx-auto bg-brand-navy/60 rounded-lg animate-pulse" />
          </div>
        </Container>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  )
}

