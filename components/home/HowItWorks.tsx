'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Container } from '../ui/Container'
import { Section } from '../ui/Section'
import { cn } from '@/lib/utils/cn'

const SEARCH_WORDS = ['TEDx', 'MUN', 'SPARK', 'Interact']
const CAROUSEL_INTERVAL_MS = 2500

const steps = [
  {
    number: 1,
    title: 'Sign in',
    bullets: ['Use your school Google account.', 'You only sign in once.'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
        />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Explore',
    bullets: ['Browse clubs and filter by year.', 'Open club pages to see details.'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Apply',
    bullets: ['Answer a few quick questions (if needed).', 'Your application is sent to club leaders.'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: 'Track',
    bullets: ['Track status in “My Applications”.', 'If approved, check the leader message and show up.'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
    ),
  },
]

function usePrefersReducedMotion() {
  const reduced = useReducedMotion()
  return reduced ?? false
}

const PREVIEW_PANEL_CLASS =
  'min-h-[180px] md:min-h-[200px] max-h-[min(38vh,240px)] rounded-xl border border-white/10 bg-brand-navy/40 overflow-hidden flex flex-col'

export function HowItWorks() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Section id="how-it-works" className="relative overflow-hidden py-8 md:py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      <Container className="relative">
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            How it works
          </h2>
          <p className="mt-1.5 text-white/60 text-sm md:text-base max-w-xl">
            Four quick steps to join a club—sign in once, then explore, apply, and track.
          </p>
        </header>

        <div className="flex flex-col gap-6 md:gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-purple text-xs font-semibold text-white">
                  {step.number}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-white">{step.title}</h3>
                  <ul className="mt-1 space-y-0.5 text-sm text-white/60 list-none">
                    {step.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </div>
                <span className="shrink-0 text-white/40">{step.icon}</span>
              </div>

              <div className={cn(PREVIEW_PANEL_CLASS)} aria-label={`Preview: ${step.title}`}>
                <div className="flex-1 min-h-0 p-4 md:p-5 flex flex-col">
                  {step.number === 1 && <PreviewSignIn reducedMotion={reducedMotion} />}
                  {step.number === 2 && <PreviewBrowse reducedMotion={reducedMotion} />}
                  {step.number === 3 && <PreviewJoin reducedMotion={reducedMotion} />}
                  {step.number === 4 && <PreviewStart reducedMotion={reducedMotion} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

function PreviewBrowse({ reducedMotion }: { reducedMotion: boolean }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const word = SEARCH_WORDS[wordIndex]

  useEffect(() => {
    if (reducedMotion) {
      setTyped(word)
      return
    }
    let i = 0
    const full = word
    const write = () => {
      if (i <= full.length) {
        setTyped(full.slice(0, i))
        i++
        setTimeout(write, 120)
      } else {
        setTimeout(() => {
          setWordIndex((idx) => (idx + 1) % SEARCH_WORDS.length)
          setTyped('')
        }, 1500)
      }
    }
    const t = setTimeout(write, 400)
    return () => clearTimeout(t)
  }, [wordIndex, word, reducedMotion])

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 shrink-0">
        <svg className="w-3.5 h-3.5 text-white/40 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-white/90 text-xs font-mono min-w-[72px]">
          {typed}
          {!reducedMotion && <span className="animate-pulse text-brand-purple">|</span>}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            whileHover={reducedMotion ? undefined : { scale: 1.02, transition: { duration: 0.2 } }}
            className="rounded bg-white/5 border border-white/10 p-1.5 flex flex-col gap-1 min-h-0"
          >
            <div className="h-5 rounded bg-white/10 w-full shrink-0" />
            <div className="h-1.5 rounded bg-white/5 w-3/4 shrink-0" />
            <div className="h-1.5 rounded bg-white/5 w-1/2 shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function PreviewSignIn({ reducedMotion }: { reducedMotion: boolean }) {
  const [clicked, setClicked] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setClicked(true)
      return
    }
    const t0 = setTimeout(() => setFocused(true), 450)
    const t1 = setTimeout(() => setClicked(true), 1050)
    const t2 = setTimeout(() => setClicked(false), 1950)
    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reducedMotion])

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-5 w-20 rounded bg-white/10 shrink-0" />
          <div className="hidden sm:block h-5 w-px bg-white/15 shrink-0" />
          <div className="h-6 w-24 rounded bg-white/5 border border-white/10 opacity-60" />
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden sm:block px-3 py-2.5 rounded-xl text-[10px] font-medium border border-transparent text-white/55">
            Home
          </div>
          <div className="hidden sm:block px-3 py-2.5 rounded-xl text-[10px] font-medium border bg-brand-purple/25 border-brand-purple/50 text-white shadow-[0_0_14px_rgba(124,58,237,0.18)]">
            Browse Clubs
          </div>
          <div className="hidden sm:block px-3 py-2.5 rounded-xl text-[10px] font-medium border border-transparent text-white/55">
            My Applications
          </div>

          <motion.button
            type="button"
            initial={false}
            animate={
              clicked
                ? { scale: 0.98 }
                : reducedMotion
                  ? { scale: 1 }
                  : focused
                    ? { scale: [1, 1.04, 1] }
                    : { scale: 1 }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.85, repeat: clicked ? 0 : focused ? Infinity : 0, ease: 'easeInOut' }
            }
            className={cn(
              'relative px-3.5 py-2.5 rounded-xl text-[10px] font-medium transition-all duration-300 ease-out border backdrop-blur-md',
              clicked
                ? 'text-white bg-brand-purple/25 border-brand-purple/50 shadow-[0_0_20px_rgba(124,58,237,0.22)]'
                : 'text-white/75 border-transparent hover:text-white hover:bg-white/[0.06] hover:border-white/5'
            )}
          >
            Sign In
            {!reducedMotion && !clicked && focused && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand-pink/80 blur-[1px]" />
            )}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col">
        <div className="text-[10px] text-white/50 mb-2">Google account</div>
        <div className="space-y-2">
          <div className={cn('h-7 rounded-md border px-2 flex items-center justify-between', clicked ? 'border-brand-purple/40 bg-brand-purple/10' : 'border-white/10 bg-white/[0.03]')}>
            <div className="h-2 w-28 rounded bg-white/10" />
            <div className="h-2 w-10 rounded bg-white/5" />
          </div>
          <div className="h-7 rounded-md border border-white/10 bg-white/[0.03] px-2 flex items-center justify-between opacity-60">
            <div className="h-2 w-24 rounded bg-white/10" />
            <div className="h-2 w-10 rounded bg-white/5" />
          </div>
        </div>

        <div className="mt-auto pt-3">
          <motion.div
            initial={false}
            animate={clicked ? { opacity: 1, y: 0 } : { opacity: reducedMotion ? 1 : 0.4, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="h-7 rounded-md bg-brand-purple/25 border border-brand-purple/40"
          />
        </div>
      </div>
    </div>
  )
}

// (PreviewLearn removed — Explore uses PreviewBrowse now.)

function PreviewJoin({ reducedMotion }: { reducedMotion: boolean }) {
  const [typed, setTyped] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setTyped('Because I want to help.')
      setSubmitted(true)
      return
    }
    let i = 0
    const full = 'Because I want to help.'
    const t0 = setTimeout(() => {
      const write = () => {
        if (i <= full.length) {
          setTyped(full.slice(0, i))
          i++
          setTimeout(write, 55)
        } else {
          setTimeout(() => setSubmitted(true), 450)
        }
      }
      write()
    }, 350)
    return () => clearTimeout(t0)
  }, [reducedMotion])

  useEffect(() => {
    if (!submitted) return
    const t = setTimeout(() => setSubmitted(false), reducedMotion ? 0 : 1800)
    return () => clearTimeout(t)
  }, [submitted, reducedMotion])

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0">
      <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 shrink-0 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] text-white/50">Apply to</div>
          <div className="text-xs text-white/90 font-semibold truncate">Operation Smile</div>
        </div>
        <motion.span
          initial={false}
          animate={submitted ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/15 text-amber-200 border-amber-500/25"
        >
          Submitted
        </motion.span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
          <div className="text-[10px] text-white/50 mb-1">Why do you want to join?</div>
          <div className="text-xs text-white/90 font-mono min-h-[1rem]">
            {typed}
            {!reducedMotion && !submitted && <span className="animate-pulse text-brand-purple">|</span>}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 opacity-70">
          <div className="text-[10px] text-white/50 mb-1">Anything we should know?</div>
          <div className="h-2 rounded bg-white/10 w-2/3" />
        </div>

        <motion.div
          initial={false}
          animate={submitted ? { scale: 0.98 } : { scale: reducedMotion ? 1 : [1, 1.02, 1] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 1.0, repeat: submitted ? 0 : Infinity, ease: 'easeInOut' }}
          className="mt-auto h-7 rounded-md bg-brand-purple/25 border border-brand-purple/40"
        />
      </div>
    </div>
  )
}

function PreviewStart({ reducedMotion }: { reducedMotion: boolean }) {
  const [state, setState] = useState<'pending' | 'approved'>('pending')
  const [showEmail, setShowEmail] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setShowEmail(true)
      setState('approved')
      return
    }
    const t1 = setTimeout(() => setShowEmail(true), 850)
    const t2 = setTimeout(() => setState('approved'), 1650)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reducedMotion])

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0">
      <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/5 border border-white/10 text-white/60 shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0l-9.75 6.75L2.25 6.75" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-[10px] text-white/50">Inbox</div>
            <div className="text-xs text-white/90 font-semibold truncate">Gmail</div>
          </div>
        </div>
        <motion.span
          initial={false}
          animate={showEmail ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 1 }}
          className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/[0.03] text-white/70 border-white/10"
        >
          {showEmail ? '1 new' : 'Checking…'}
        </motion.span>
      </div>

      <motion.div
        initial={false}
        animate={showEmail ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: reducedMotion ? 0 : 0.25 }}
        className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2"
      >
        <div className="text-[10px] text-white/50 truncate">Operation Smile — Application Approved</div>
        <div className="text-xs text-white/85 truncate mt-0.5">First meeting: Tue Lunch 2 • Room 12-101</div>
      </motion.div>

      <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] text-white/50">My Applications</div>
          <div className="text-xs text-white/90 font-semibold truncate">Operation Smile</div>
        </div>
        <motion.span
          initial={false}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
            state === 'pending'
              ? 'bg-amber-500/15 text-amber-200 border-amber-500/25'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
          )}
        >
          {state === 'pending' ? 'Pending' : 'Approved'}
        </motion.span>
      </div>

      <div className="flex-1 min-h-0 rounded-lg bg-white/5 border border-white/10 p-3 flex flex-col">
        <div className="text-[10px] text-white/50 mb-2">
          {state === 'pending' ? 'Waiting for review…' : 'Message from club leader'}
        </div>
        {state === 'pending' ? (
          <div className="space-y-2">
            <div className="h-2 rounded bg-white/10 w-5/6" />
            <div className="h-2 rounded bg-white/10 w-2/3" />
            <div className="h-2 rounded bg-white/10 w-1/2" />
          </div>
        ) : (
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
            className="mt-0.5 text-xs text-white/85 leading-relaxed"
          >
            First meeting: Tuesday Lunch 2 — Room 12-101.
            <br />
            Bring a notebook and be ready to help with fundraising.
          </motion.div>
        )}
        <div className="mt-auto pt-3">
          <div
            className={cn(
              'h-7 rounded-md border',
              state === 'pending' ? 'bg-white/[0.03] border-white/10' : 'bg-brand-purple/25 border-brand-purple/40'
            )}
          />
        </div>
      </div>
    </div>
  )
}
