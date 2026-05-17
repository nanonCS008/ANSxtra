'use client'

import { Input } from '@/components/ui/Input'
import { parseStageCrewVideoLink } from '@/lib/stageCrewVideoLink'
import { cn } from '@/lib/utils/cn'
import { useCallback, useId, useState } from 'react'

type VideoLinkFieldProps = {
  fieldKey: string
  label: string
  helper?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
}

export function VideoLinkField({
  fieldKey,
  label,
  helper,
  required,
  value,
  onChange,
  onBlur,
  error,
}: VideoLinkFieldProps) {
  const inputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)
  const displayError = error ?? localError

  const normalizeOnBlur = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) {
        onChange('')
        setLocalError(required ? 'Please paste your video link.' : null)
        return
      }
      const parsed = parseStageCrewVideoLink(trimmed)
      if (!parsed.ok) {
        setLocalError(parsed.error)
        onChange(trimmed)
        return
      }
      setLocalError(null)
      onChange(parsed.url)
    },
    [onChange, required]
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
          onChange(e.target.value)
        }}
        onBlur={() => {
          normalizeOnBlur(value)
          onBlur?.()
        }}
        error={displayError ?? undefined}
        helperText={helper}
      />

      <div
        className={cn(
          'mt-3 rounded-xl border border-white/10 bg-brand-navy/40 p-4 text-sm text-white/60 leading-relaxed space-y-2'
        )}
      >
        <p className="font-medium text-white/80">What to record</p>
        <p>
          Record a <strong className="text-white/75 font-medium">1–2 minute video</strong> of yourself
          explaining{' '}
          <strong className="text-white/75 font-medium">
            why you want to join the School Show Stage Crew
          </strong>
          . Upload it to YouTube or Google Drive, then paste the link above.
        </p>
        <p className="font-medium text-white/80 pt-1">Sharing (so leaders can watch it)</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-white/75 font-medium">YouTube:</strong> set the video to{' '}
            <em>Public</em> or <em>Unlisted</em> (not Private).
          </li>
          <li>
            <strong className="text-white/75 font-medium">Google Drive:</strong> Share → General access
            → <em>Anyone with the link</em> (Viewer).
          </li>
        </ul>
        <p className="text-white/45 text-xs">
          Test your link in an incognito/private window before you submit. Only Stage Crew leaders will
          see your link in the admin panel and export.
        </p>
      </div>
    </div>
  )
}
