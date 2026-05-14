'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const ROTARY_ABOUT =
  "Rotary International is one of the world's largest service organizations, founded in 1905, bringing together business, professional, and community leaders to solve real global challenges—from education and healthcare to clean water, peacebuilding, and disaster relief. Rotary operates in 200+ countries and regions, with over 1.2 million members worldwide."

const STATS = [
  { key: 'countries', label: 'Countries & territories', target: 145, suffix: '+' },
  { key: 'students', label: 'Students worldwide', target: 340_000, suffix: '+' },
  { key: 'clubs', label: 'Interact clubs worldwide', target: 15_000, suffix: '+' },
] as const

const WHY_JOIN = [
  {
    title: 'Global recognition',
    body: "Be part of Rotary International's youth network—local projects with worldwide reach across 145+ countries and territories, alongside hundreds of thousands of young leaders.",
  },
  {
    title: 'Real leadership experience',
    body: 'Plan and deliver charities, fundraisers, and school initiatives with tangible outcomes: budgeting, events, outreach, and teamwork you can point to.',
  },
  {
    title: "Stand out for what's next",
    body: 'Build meaningful experiences for university applications, scholarships, and interviews—and develop the habits of leadership future opportunities reward.',
  },
] as const

const INTERACT_ROLES = [
  'Treasurer',
  'Secretary',
  'Coordinators',
  'Public Relations',
  'Fundraising / events',
  'Operators',
] as const

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return { r: 217, g: 70, b: 239 }
  const n = Number.parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function formatStat(n: number, suffix: string) {
  if (n >= 1000) return `${n.toLocaleString('en-US')}${suffix}`
  return `${n}${suffix}`
}

function StatFigure({
  target,
  suffix,
  label,
  reduced,
  tintHex,
}: {
  target: number
  suffix: string
  label: string
  reduced: boolean | null
  tintHex: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const [n, setN] = useState(reduced ? target : 0)
  const { r, g, b } = hexToRgb(tintHex)

  useEffect(() => {
    if (reduced) {
      setN(target)
      return
    }
    if (!inView) return
    const start = performance.now()
    const dur = 950
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - (1 - p) ** 2.4
      setN(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, reduced])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] px-4 py-5 sm:px-5 sm:py-6"
      style={{
        boxShadow: `inset 0 1px 0 rgba(${r},${g},${b},0.12)`,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: tintHex }} aria-hidden />
      <p
        className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-none"
        style={{
          color: tintHex,
          textShadow: `0 0 28px rgba(${r},${g},${b},0.35)`,
        }}
      >
        {formatStat(n, suffix)}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{label}</p>
    </motion.div>
  )
}

export function InteractClubDetail({ tintHex }: { tintHex: string }) {
  const reduced = useReducedMotion()
  const { r, g, b } = hexToRgb(tintHex)

  return (
    <div className="space-y-7 md:space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-white/10 px-4 py-5 sm:px-6 sm:py-5"
        style={{
          borderLeftWidth: 3,
          borderLeftColor: tintHex,
          background: `linear-gradient(105deg, rgba(${r},${g},${b},0.09) 0%, rgba(255,255,255,0.025) 55%)`,
        }}
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">What is Rotary?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/82 md:text-[15px] md:leading-relaxed">{ROTARY_ABOUT}</p>
      </motion.section>

      <div>
        <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Global scale</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STATS.map((s) => (
            <StatFigure key={s.key} target={s.target} suffix={s.suffix} label={s.label} reduced={reduced} tintHex={tintHex} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Why join?</h2>
        <div className="space-y-3">
          {WHY_JOIN.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.05 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5 sm:py-4"
              style={{ borderLeftWidth: 3, borderLeftColor: tintHex }}
            >
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <section id="interact-roles" className="scroll-mt-header">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Roles</h2>
        <p className="mb-3 max-w-3xl text-[13px] leading-relaxed text-white/60">
          Each role is staffed by a group of members—typically <span className="font-semibold text-white/75">1–10 people per role</span>, depending on the year and how many students step up.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {INTERACT_ROLES.map((title, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.04 }}
              className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 sm:py-4"
              style={{ borderLeftWidth: 3, borderLeftColor: tintHex }}
            >
              <h3 className="text-sm font-bold text-white sm:text-[15px]">{title}</h3>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
