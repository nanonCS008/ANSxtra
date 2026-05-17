'use client'

import { Input } from '@/components/ui/Input'
import { parseStageCrewVideoLink } from '@/lib/stageCrewVideoLink'
import { cn } from '@/lib/utils/cn'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

type VideoLinkFieldProps = {
  fieldKey: string
  label: string
  helper?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onVerifiedChange?: (verified: boolean) => void
  error?: string
}

type VerifyState = 'idle' | 'checking' | 'verified' | 'failed'

export function VideoLinkField({
  fieldKey,
  label,
  helper,
  required,
  value,
  onChange,
  onBlur,
  onVerifiedChange,
  error,
}: VideoLinkFieldProps) {
  const inputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const lastCheckedUrl = useRef<string | null>(null)
  const verifyRequestId = useRef(0)

  const displayError = error ?? localError

  useEffect(() => {
    const verified = verifyState === 'verified' && Boolean(value.trim())
    onVerifiedChange?.(verified)
  }, [verifyState, value, onVerifiedChange])

  const verifyLink = useCallback(async (normalizedUrl: string) => {
    if (lastCheckedUrl.current === normalizedUrl) {
      setVerifyState('verified')
      return true
    }

    const requestId = ++verifyRequestId.current
    setVerifyState('checking')
    setLocalError(null)

    try {
      const res = await fetch('/api/applications/verify-video-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: normalizedUrl }),
      })
      const payload = await res.json().catch(() => ({}))

      if (requestId !== verifyRequestId.current) return false

      if (!res.ok || payload?.ok !== true) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'We could not verify this link is viewable without signing in.'
        setLocalError(message)
        setVerifyState('failed')
        lastCheckedUrl.current = null
        return false
      }

      const confirmedUrl = typeof payload?.url === 'string' ? payload.url : normalizedUrl
      lastCheckedUrl.current = confirmedUrl
      setVerifyState('verified')
      setLocalError(null)
      if (confirmedUrl !== normalizedUrl) {
        onChange(confirmedUrl)
      }
      return true
    } catch {
      if (requestId !== verifyRequestId.current) return false
      setLocalError('Could not verify the link right now. Please try again.')
      setVerifyState('failed')
      lastCheckedUrl.current = null
      return false
    }
  }, [onChange])

  const validateAndCommit = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) {
        onChange('')
        setLocalError(required ? 'Please paste your video link.' : null)
        setVerifyState('idle')
        lastCheckedUrl.current = null
        return
      }

      const parsed = parseStageCrewVideoLink(trimmed)
      if (!parsed.ok) {
        setLocalError(parsed.error)
        onChange(trimmed)
        setVerifyState('failed')
        lastCheckedUrl.current = null
        return
      }

      onChange(parsed.url)
      await verifyLink(parsed.url)
    },
    [onChange, required, verifyLink]
  )

  return (
    <div className="w-full">
      <Input
        id={inputId}
        name={fieldKey}
        type="url"
        inputMode="url"
        autoComplete="url"
        label={label}
        required={required}
        placeholder="https://www.youtube.com/watch?v=… or https://drive.google.com/file/d/…/view"
        value={value}
        onChange={(e) => {
          setLocalError(null)
          setVerifyState('idle')
          lastCheckedUrl.current = null
          onChange(e.target.value)
        }}
        onBlur={() => {
          void validateAndCommit(value)
          onBlur?.()
        }}
        error={displayError ?? undefined}
        helperText={helper}
      />

      {verifyState === 'checking' && (
        <p className="mt-2 text-sm text-white/55">Checking that your link opens without sign-in…</p>
      )}

      {verifyState === 'verified' && !displayError && (
        <p className="mt-2 text-sm text-emerald-400/90">Link verified — reviewers can open this video.</p>
      )}

      <div
        className={cn(
          'mt-3 rounded-xl border border-white/10 bg-brand-navy/40 p-4 text-sm text-white/60 leading-relaxed space-y-2'
        )}
      >
        <p className="font-medium text-white/80">Link requirements</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-white/75 font-medium">YouTube:</strong> Public or Unlisted (not
            Private).
          </li>
          <li>
            <strong className="text-white/75 font-medium">Google Drive:</strong> Share → General access
            → <em>Anyone with the link</em> (Viewer).
          </li>
        </ul>
        <p className="text-white/45 text-xs">
          After pasting, wait for “Link verified”. Test your link in an incognito/private window before
          submitting.
        </p>
      </div>
    </div>
  )
}
