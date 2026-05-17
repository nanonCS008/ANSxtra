'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CheckboxGroup } from '@/components/ui/CheckboxGroup'
import { Container } from '@/components/ui/Container'
import { Input, Textarea } from '@/components/ui/Input'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { getApplyErrorMessage, submitApplication } from '@/lib/api'
import { saveApplication, type ClubApplicationPayload } from '@/lib/applications'
import { getClubFormFields } from '@/lib/clubFormFields'
import { STAGE_CREW_TEAM_OPTIONS } from '@/lib/schoolShowStageCrew'
import { getExternalSignupMessage, isExternalSignupClub } from '@/lib/externalSignupClubs'
import { isValidStoredDobIso } from '@/lib/dmyDate'
import { TEDX_ARCHIVE_ITEMS } from '@/components/clubs/TEDxLivestreamArchive'
import { DmyDateField } from '@/components/join/DmyDateField'
import { getClubById } from '@/lib/data'
import { cn } from '@/lib/utils/cn'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { notFound, useParams, useRouter } from 'next/navigation'
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

type FieldKind =
  | 'text'
  | 'textarea'
  | 'date'
  | 'dmyDate'
  | 'radio'
  | 'select'
  | 'checkbox'
  | 'checkboxGroup'
  | 'file'
  | 'video'
type ResponseValue = string | boolean | string[]

type FieldDef = {
  key: string
  kind: FieldKind
  label: string
  required: boolean | ((state: { responses: Record<string, ResponseValue> }) => boolean)
  visible?: (state: { responses: Record<string, ResponseValue> }) => boolean
  options?: string[] | ((state: { responses: Record<string, ResponseValue> }) => string[])
  minLength?: number
  helper?: ReactNode
  placeholder?: string
}

function isVisible(field: FieldDef, state: { responses: Record<string, ResponseValue> }) {
  return field.visible ? field.visible(state) : true
}

function isRequired(field: FieldDef, state: { responses: Record<string, ResponseValue> }) {
  return typeof field.required === 'function' ? field.required(state) : field.required
}

const NO_QUESTIONS_CLUB_IDS = new Set(['mun', 'enterprise-club'])

type JoinFormCopy = {
  pageDescription?: string
  questionsIntro?: string
  questionsNote?: string
  textareaPlaceholder?: string
}

const JOIN_FORM_COPY: Partial<Record<string, JoinFormCopy>> = {
  'school-show': {
    pageDescription:
      'Submitting this application does not guarantee selection into the School Show Stage Crew. Applications will be reviewed by the leadership team.',
    questionsIntro: 'School Show Stage Crew application',
  },
  mun: {
    pageDescription:
      'This club has no application questions. Review your details below and submit to apply straight away.',
  },
  'enterprise-club': {
    pageDescription:
      'This club has no application questions. Review your details below and submit to apply straight away.',
  },
}

function getClubFields(clubId: string): FieldDef[] {
  const base = getClubFormFields(clubId)

  if (clubId === 'school-show') {
    return base.map((f) => {
      if (f.key !== 'preferred_team_choice_2') return f
      return {
        ...f,
        options: ({ responses }: { responses: Record<string, ResponseValue> }) => {
          const first = typeof responses.preferred_team_choice_1 === 'string'
            ? responses.preferred_team_choice_1
            : ''
          return STAGE_CREW_TEAM_OPTIONS.filter((team) => team !== first)
        },
      }
    })
  }

  // Small compatibility shim: only show the "Other" textbox when "Other" is selected.
  if (clubId === 'spark-club') {
    return base.map((f) => {
      if (f.key !== 'field_of_interests_other') return f
      return {
        ...f,
        required: ({ responses }) =>
          Array.isArray(responses.field_of_interests) &&
          responses.field_of_interests.includes('Other'),
        visible: ({ responses }) =>
          Array.isArray(responses.field_of_interests) &&
          responses.field_of_interests.includes('Other'),
      }
    })
  }

  return base
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const clubId = params.id as string
  const club = getClubById(clubId)

  const [responses, setResponses] = useState<Record<string, ResponseValue>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<{ code?: string; message: string } | null>(null)
  const [userProfile, setUserProfile] = useState<{ year_group: number } | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return

    setProfileError(null)
    const res = await fetch('/api/profile/me', { cache: 'no-store' })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setProfileError(payload?.error ?? 'Failed to verify your student account.')
      return
    }

    const data = await res.json()
    if (data?.year_group) {
      setUserProfile({ year_group: data.year_group })
      return
    }

    setProfileError('Failed to verify your student account.')
  }, [session])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      const next = `/join/${encodeURIComponent(clubId)}`
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(next)}`)
      return
    }

    fetchUserProfile()
  }, [session, status, router, fetchUserProfile])

  useEffect(() => {
    const blockIfAlreadyApplied = async () => {
      if (status === 'loading') return
      if (!session?.user?.id) return
      if (!club?.id) return

      const res = await fetch('/api/applications', { cache: 'no-store' })
      if (!res.ok) return
      const rows = (await res.json()) as Array<{ club_id?: string }>
      const already = rows.some((r) => String(r.club_id ?? '').trim() === club.id)
      if (already) {
        router.replace('/my-applications')
      }
    }

    void blockIfAlreadyApplied()
  }, [club?.id, router, session?.user?.id, status])

  if (!club) {
    notFound()
  }

  const fields = useMemo(() => getClubFields(club.id), [club.id])
  const formCopy = JOIN_FORM_COPY[club.id]
  const state = useMemo(() => ({ responses }), [responses])
  const defaultTextareaPlaceholder = formCopy?.textareaPlaceholder ?? 'Your answer…'

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})

  const getValidationErrors = useCallback(() => {
    const newErrors: Record<string, string> = {}

    for (const field of fields) {
      if (!isVisible(field, state)) continue
      if (!isRequired(field, state)) continue

      const v = responses[field.key]
      if (field.kind === 'checkbox') {
        if (v !== true) newErrors[field.key] = 'You must confirm this to proceed'
        continue
      }
      if (field.kind === 'checkboxGroup') {
        const arr = Array.isArray(v) ? v : []
        if (arr.length < 1) newErrors[field.key] = 'Please select at least one option'
        continue
      }
      if (field.kind === 'dmyDate') {
        const s = typeof v === 'string' ? v.trim() : ''
        if (!s) {
          newErrors[field.key] = 'This field is required'
          continue
        }
        if (!isValidStoredDobIso(s)) {
          newErrors[field.key] = 'Please choose a valid date of birth'
          continue
        }
        continue
      }
      const s = typeof v === 'string' ? v.trim() : ''
      if (!s) {
        newErrors[field.key] = 'This field is required'
        continue
      }
      const minLength = field.minLength ?? (field.kind === 'textarea' ? 5 : undefined)
      if (minLength != null && s.length < minLength) {
        newErrors[field.key] = `Please enter at least ${minLength} characters`
      }
    }

    if (clubId === 'school-show') {
      const team1 = typeof responses.preferred_team_choice_1 === 'string'
        ? responses.preferred_team_choice_1.trim()
        : ''
      const team2 = typeof responses.preferred_team_choice_2 === 'string'
        ? responses.preferred_team_choice_2.trim()
        : ''
      if (team1 && team2 && team1 === team2) {
        newErrors.preferred_team_choice_2 = 'Please choose a different team for your second preference'
      }
    }

    return newErrors
  }, [responses, fields, state, clubId])

  const validationErrors = useMemo(() => getValidationErrors(), [getValidationErrors])
  const canSubmit = club.accepting && !isSubmitting && Object.keys(validationErrors).length === 0

  const derivedStudentId = useMemo(() => {
    const email = session?.user?.email?.trim().toLowerCase() ?? ''
    const at = email.indexOf('@')
    if (at <= 0) return null
    const local = email.slice(0, at)
    const domain = email.slice(at + 1)
    if (domain !== 'student.amnuaysilpa.ac.th') return null
    return local || null
  }, [session?.user?.email])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  // Check eligibility
  const isEligible = userProfile?.year_group && 
    userProfile.year_group >= (club.yearGroupMin ?? 7) && 
    userProfile.year_group <= (club.yearGroupMax ?? 13)

  if (userProfile && !isEligible) {
    return (
      <div className="min-h-screen bg-brand-deep pt-24 pb-12">
        <Container size="narrow">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Not Eligible</h1>
            <p className="text-white/70 mb-6">
              This club is only available for Year {club.yearGroupMin}-{club.yearGroupMax} students. 
              You are in Year {userProfile.year_group}.
            </p>
            <Link href="/clubs">
              <Button>Browse Other Clubs</Button>
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-brand-deep pt-24 pb-12">
        <Container size="narrow">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Account not recognized</h1>
            <p className="text-white/70 mb-6">{profileError}</p>
            <Link href="/clubs">
              <Button>Browse Clubs</Button>
            </Link>
          </div>
        </Container>
      </div>
    )
  }

  if (isExternalSignupClub(club.id)) {
    return (
      <div className="min-h-screen bg-brand-deep pt-24 pb-16">
        <Container size="narrow">
          <h1 className="text-2xl font-bold text-white mb-3">External sign-up</h1>
          <p className="text-white/70 text-sm leading-relaxed mb-6">{getExternalSignupMessage(club.id)}</p>
          <Link href={`/clubs/${club.id}`}>
            <Button>Back to {club.displayName ?? club.name}</Button>
          </Link>
        </Container>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setSubmitAttempted(true)

    const newErrors = getValidationErrors()
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const orderedKeys = [
        ...fields
          .filter((f) => isVisible(f, state))
          .map((f) => f.key),
      ]
      const firstKey = orderedKeys.find((k) => newErrors[k])
      if (firstKey) {
        const el = fieldRefs.current[firstKey]
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Focus if it’s an actual input/textarea
        requestAnimationFrame(() => {
          const fdef = fields.find((f) => f.key === firstKey)
          const focusId = fdef?.kind === 'dmyDate' ? `${firstKey}-day` : firstKey
          const input = document.getElementById(focusId) as HTMLInputElement | HTMLTextAreaElement | null
          input?.focus()
        })
      }
      return
    }

    if (!club.accepting) return

    setIsSubmitting(true)
    setSubmitError(null)

    const responsesForApi: Record<string, string> = {}
    const responsesForPayload: Record<string, unknown> = {}
    for (const field of fields) {
      if (!isVisible(field, state)) continue
      const v = responses[field.key]
      if (v == null) continue
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (!trimmed) continue
        responsesForApi[field.key] = trimmed
        responsesForPayload[field.key] = trimmed
      } else if (Array.isArray(v)) {
        if (v.length === 0) continue
        responsesForApi[field.key] = JSON.stringify(v)
        responsesForPayload[field.key] = v
      } else {
        responsesForApi[field.key] = String(v)
        responsesForPayload[field.key] = v
      }
    }

    const payload: ClubApplicationPayload = {
      club_id: club.id,
      club_name: club.displayName ?? club.name,
      club_url: `/clubs/${club.id}`,
      student_id: derivedStudentId ?? '',
      responses: responsesForPayload,
      submitted_at: new Date().toISOString(),
    }

    try {
      console.log('Submitting club application', {
        clubId: club.id,
        responseKeys: Object.keys(responsesForApi),
      })
      await submitApplication(club.id, {
        responses: responsesForApi,
      })
      saveApplication(payload)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12)
      }
      const urlParams = new URLSearchParams({
        club: club.displayName ?? club.name,
        studentId: derivedStudentId ?? '',
      })
      router.push(`/join/confirmation?${urlParams.toString()}`)
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      const code = err.code ?? 'UNKNOWN'
      setSubmitError({
        code,
        message: getApplyErrorMessage(code, err.message),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showErrorFor = (key: string) => submitAttempted || touched[key]

  const renderField = (field: FieldDef) => {
    if (!isVisible(field, state)) return null
    const error = showErrorFor(field.key) ? validationErrors[field.key] : undefined
    const required = isRequired(field, state)
    const v = responses[field.key]
    const resolvedOptions =
      typeof field.options === 'function' ? field.options(state) : (field.options ?? [])

    if (field.kind === 'select') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <label htmlFor={field.key} className="block text-sm font-medium text-white/90 mb-2">
            {field.label}
            {required && <span className="text-brand-pink ml-1">*</span>}
          </label>
          <select
            id={field.key}
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => {
              setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
              setTouched((prev) => ({ ...prev, [field.key]: true }))
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
            className={cn(
              'w-full min-h-[44px] px-4 py-3 rounded-xl',
              'bg-brand-navy/80 border border-white/10',
              'text-white text-sm',
              'focus:outline-none focus:border-brand-pink/50 focus:ring-2 focus:ring-brand-pink/20',
              'transition-all duration-200',
              '[color-scheme:dark]',
              error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            )}
            required={required}
          >
            <option value="" disabled>
              Select your homeroom
            </option>
            {resolvedOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )
    }

    if (field.kind === 'radio') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <RadioGroup
            label={field.label}
            name={field.key}
            options={resolvedOptions.map((opt) => ({ value: opt, label: opt }))}
            value={typeof v === 'string' ? v : ''}
            onChange={(value) => {
              setResponses((prev) => {
                const next = { ...prev, [field.key]: value }
                if (
                  clubId === 'school-show' &&
                  field.key === 'preferred_team_choice_1' &&
                  prev.preferred_team_choice_2 === value
                ) {
                  delete next.preferred_team_choice_2
                }
                return next
              })
              setTouched((prev) => ({ ...prev, [field.key]: true }))
            }}
            error={error}
            required={required}
          />
        </div>
      )
    }

    if (field.kind === 'checkboxGroup') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <CheckboxGroup
            label={field.label}
            name={field.key}
            options={resolvedOptions.map((opt) => ({ value: opt, label: opt }))}
            value={Array.isArray(v) ? v : []}
            onChange={(value) => {
              setResponses((prev) => ({ ...prev, [field.key]: value }))
              setTouched((prev) => ({ ...prev, [field.key]: true }))
            }}
            error={error}
            required={required}
          />
        </div>
      )
    }

    if (field.kind === 'checkbox') {
      const checked = v === true
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <label
            className={cn(
              'flex items-start gap-4 min-h-[48px] p-4 rounded-xl cursor-pointer',
              'bg-brand-navy/60 border border-white/10',
              'transition-all duration-200',
              'hover:border-white/20 hover:bg-brand-navy/80',
              checked && 'border-brand-pink/50 bg-brand-pink/10',
              error && 'border-red-500/50'
            )}
          >
            <input
              type="checkbox"
              id={field.key}
              checked={checked}
              onChange={(e) => {
                setResponses((prev) => ({ ...prev, [field.key]: e.target.checked }))
                setTouched((prev) => ({ ...prev, [field.key]: true }))
              }}
              className="sr-only"
            />
            <span
              className={cn(
                'w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                'transition-all duration-200',
                checked
                  ? 'border-brand-pink bg-brand-pink'
                  : 'border-white/30 bg-transparent'
              )}
              aria-hidden
            >
              {checked && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-white/90 text-sm leading-relaxed">
              {field.label}
              {required && <span className="text-brand-pink ml-1">*</span>}
            </span>
          </label>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )
    }

    if (field.kind === 'dmyDate') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <DmyDateField
            fieldKey={field.key}
            label={field.label}
            required={required}
            value={typeof v === 'string' ? v : ''}
            onChange={(iso) => {
              setResponses((prev) => ({ ...prev, [field.key]: iso }))
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
            error={error}
          />
        </div>
      )
    }

    if (field.kind === 'date') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          <label htmlFor={field.key} className="block text-sm font-medium text-white/90 mb-2">
            {field.label}
            {required && <span className="text-brand-pink ml-1">*</span>}
          </label>
          <input
            type="date"
            id={field.key}
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => {
              setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
              setTouched((prev) => ({ ...prev, [field.key]: true }))
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
            className={cn(
              'w-full min-h-[44px] px-4 py-3 rounded-xl',
              'bg-brand-navy/80 border border-white/10',
              'text-white',
              'focus:outline-none focus:border-brand-pink/50 focus:ring-2 focus:ring-brand-pink/20',
              'transition-all duration-200',
              '[color-scheme:dark]',
              error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
            )}
            required={required}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )
    }

    if (field.kind === 'textarea') {
      return (
        <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
          {field.helper}
          <Textarea
            id={field.key}
            label={field.label}
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => {
              setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
            error={error}
            required={required}
            placeholder={field.placeholder ?? defaultTextareaPlaceholder}
          />
        </div>
      )
    }

    // text
    return (
      <div ref={(el) => { fieldRefs.current[field.key] = el }} className="w-full">
        <Input
          id={field.key}
          label={field.label}
          value={typeof v === 'string' ? v : ''}
          onChange={(e) => {
            setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
          }}
          onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
          error={error}
          required={required}
          placeholder={field.placeholder ?? 'Your answer...'}
        />
      </div>
    )
  }

  return (
    <div className="pt-24 pb-24 md:pb-16 min-h-screen overflow-x-hidden">
      <Container size="narrow" className="min-w-0 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0"
        >
          <Link
            href={`/clubs/${club.id}`}
            className="inline-flex items-center text-white/60 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {club.name}
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Apply to {club.name}
          </h1>
          <p className="text-white/60 mb-8">
            {formCopy?.pageDescription ??
              (fields.length === 0
                ? NO_QUESTIONS_CLUB_IDS.has(club.id)
                  ? 'This club has no application questions. Review your details below and submit to apply straight away.'
                  : 'Confirm your details below and submit to register your interest with the club leaders.'
                : 'Fill out the form below to submit your application.')}
          </p>

          {!club.accepting && (
            <Card padding="lg" className="border-amber-500/30 bg-amber-500/10 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-amber-400 font-semibold mb-1">Not Accepting Members</h3>
                  <p className="text-white/70 text-sm">
                    This club is currently not accepting new members. Please check back later.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="min-w-0">
            {/* Student identity */}
            <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-bold text-white mb-2">Student Account</h2>
              <p className="text-white/60 text-sm">
                Signed in as <span className="text-white/85 font-medium">{session.user?.name ?? 'Unknown name'}</span>
              </p>
              <p className="text-white/50 text-sm mt-2">
                <span className="text-white/70">Email:</span>{' '}
                <span className="text-white/85 font-medium">{session.user?.email ?? 'Unknown email'}</span>
              </p>
            </Card>

            {club.id === 'tedx' && (
              <div className="mb-6 rounded-xl border border-[#c92a2a]/30 bg-[#c92a2a]/5 px-4 py-3">
                <p className="text-white/80 text-sm font-medium mb-2">
                  Watch a past TEDx Youth talk before you apply
                </p>
                <div className="flex flex-wrap gap-2">
                  {TEDX_ARCHIVE_ITEMS.map((item) => (
                    <a
                      key={item.year}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-white/15 bg-brand-navy/60 px-3 py-1.5 text-sm text-white/90 hover:border-[#c92a2a]/50 hover:text-white transition-colors"
                    >
                      {item.year} talk{item.mostRecent ? ' (latest)' : ''}
                    </a>
                  ))}
                  <Link
                    href="/clubs/tedx"
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-white/55 hover:text-white/80 transition-colors"
                  >
                    View on club page →
                  </Link>
                </div>
              </div>
            )}

            {/* Application questions */}
            {fields.length > 0 && (
              <Card padding="lg" className="mb-6">
                <h2 className="text-lg font-bold text-white mb-2">
                  Application Questions
                </h2>
                <p className="text-white/60 text-sm mb-3">
                  {formCopy?.questionsIntro ?? 'Please answer the following questions.'}
                </p>
                {formCopy?.questionsNote ? (
                  <p className="text-white/45 text-sm mb-6 border-l-2 border-brand-pink/40 pl-3">
                    {formCopy.questionsNote}
                  </p>
                ) : (
                  <div className="mb-6" aria-hidden />
                )}
                
                <div className="space-y-6">
                  {fields.map((field) => (
                    <div key={field.key}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Submit button */}
            {submitError && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/50 bg-red-500/10 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-200 text-sm">{submitError.message}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={!club.accepting || isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit application'
              )}
            </Button>

            {!club.accepting && (
              <p className="text-white/50 text-sm text-center mt-4">
                This club is not currently accepting applications.
              </p>
            )}

            {club.accepting && !isSubmitting && !canSubmit && (
              <p className="text-white/45 text-sm text-center mt-4">
                Complete required fields to submit.
              </p>
            )}

            <p className="text-white/40 text-sm text-center mt-4">
              By submitting, you agree to participate in club activities and follow club guidelines.
            </p>
          </form>
        </motion.div>
      </Container>
    </div>
  )
}
