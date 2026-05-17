'use client'

import { Button } from '@/components/ui/Button'
import {
  APPLICATION_VIDEO_ACCEPT,
  APPLICATION_VIDEO_MAX_BYTES,
  APPLICATION_VIDEO_MAX_SECONDS,
  APPLICATION_VIDEO_MIN_SECONDS,
  formatVideoDuration,
  inferVideoContentType,
  isVideoFile,
} from '@/lib/applicationVideo'
import { readVideoDurationSeconds } from '@/lib/readVideoDuration'
import { uploadApplicationVideo } from '@/lib/uploadApplicationVideo'
import { cn } from '@/lib/utils/cn'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

type VideoSubmissionFieldProps = {
  fieldKey: string
  clubId: string
  label: string
  helper?: string
  required?: boolean
  value: string
  onChange: (publicUrl: string) => void
  onBlur?: () => void
  onUploadingChange?: (uploading: boolean) => void
  error?: string
}

export function VideoSubmissionField({
  fieldKey,
  clubId,
  label,
  helper,
  required,
  value,
  onChange,
  onBlur,
  onUploadingChange,
  error,
}: VideoSubmissionFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const savedUrlRef = useRef(value)
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [durationLabel, setDurationLabel] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'uploading' | 'done' | 'error'>(
    value ? 'done' : 'idle'
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const displayUrl = value.trim() || savedUrlRef.current.trim()
  const displayError = error ?? localError
  const isUploaded = status === 'done' && Boolean(displayUrl)

  useEffect(() => {
    if (value.trim()) {
      savedUrlRef.current = value.trim()
      setStatus('done')
      setLocalError(null)
    }
  }, [value])

  useEffect(() => {
    onUploadingChange?.(status === 'checking' || status === 'uploading')
  }, [status, onUploadingChange])

  const resetSelection = useCallback(() => {
    savedUrlRef.current = ''
    flushSync(() => onChange(''))
    setFileLabel(null)
    setDurationLabel(null)
    setLocalError(null)
    setUploadProgress(null)
    setStatus('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [onChange])

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      setLocalError(null)
      setUploadProgress(null)

      if (!isVideoFile(file)) {
        setLocalError(
          'Please choose a video file (not a photo). On iPhone, pick a video from your library or record a new one.'
        )
        setStatus('error')
        onBlur?.()
        return
      }

      const contentType = inferVideoContentType(file)

      if (file.size > APPLICATION_VIDEO_MAX_BYTES) {
        setLocalError(
          `This file is too large (${Math.round(file.size / (1024 * 1024))} MB). Maximum is ${Math.round(APPLICATION_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`
        )
        setStatus('error')
        onBlur?.()
        return
      }

      setStatus('checking')
      setFileLabel(file.name)

      let durationSec: number
      try {
        durationSec = await readVideoDurationSeconds(file)
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Could not read video.')
        setStatus('error')
        onBlur?.()
        return
      }

      setDurationLabel(formatVideoDuration(durationSec))

      if (durationSec < APPLICATION_VIDEO_MIN_SECONDS) {
        setLocalError(
          `Your video is ${formatVideoDuration(durationSec)}. Please record at least ${formatVideoDuration(APPLICATION_VIDEO_MIN_SECONDS)} (1 minute).`
        )
        setStatus('error')
        onBlur?.()
        return
      }

      if (durationSec > APPLICATION_VIDEO_MAX_SECONDS) {
        setLocalError(
          `Your video is ${formatVideoDuration(durationSec)}. Please keep it to about 2 minutes or less.`
        )
        setStatus('error')
        onBlur?.()
        return
      }

      setStatus('uploading')
      setUploadProgress('Uploading video…')

      try {
        const publicUrl = await uploadApplicationVideo(file, clubId, contentType)
        savedUrlRef.current = publicUrl
        flushSync(() => onChange(publicUrl))
        setStatus('done')
        setUploadProgress(null)
        onBlur?.()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed.'
        setLocalError(message)
        setStatus('error')
        setUploadProgress(null)
        onBlur?.()
      }
    },
    [clubId, onChange, onBlur]
  )

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-sm font-medium text-white/90 mb-2">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>

      {helper && <p className="text-white/55 text-sm leading-relaxed mb-3">{helper}</p>}

      <p className="text-white/45 text-xs mb-3 leading-relaxed">
        Record or choose a 1–2 minute video from your device. Only Stage Crew leaders will review it.
      </p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={APPLICATION_VIDEO_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          void handleFile(file)
        }}
      />

      <input type="hidden" name={fieldKey} value={displayUrl} readOnly aria-hidden />

      <div
        className={cn(
          'rounded-xl border border-dashed p-4 md:p-5 transition-colors',
          displayError ? 'border-red-500/40 bg-red-500/5' : 'border-white/15 bg-brand-navy/40',
          isUploaded && !displayError && 'border-brand-pink/35 bg-brand-pink/5'
        )}
      >
        {isUploaded ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-pink/20 text-brand-pink">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium text-sm">Video uploaded</p>
                {fileLabel && <p className="text-white/60 text-xs mt-0.5 truncate">{fileLabel}</p>}
                {durationLabel && (
                  <p className="text-white/50 text-xs mt-0.5">Length: {durationLabel}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                Replace video
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetSelection}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Button
              type="button"
              size="lg"
              fullWidth
              disabled={status === 'checking' || status === 'uploading'}
              onClick={() => inputRef.current?.click()}
              className="min-h-[48px]"
            >
              {status === 'uploading'
                ? uploadProgress ?? 'Uploading…'
                : status === 'checking'
                  ? 'Checking video…'
                  : 'Choose or record video'}
            </Button>
            <p className="text-white/40 text-xs mt-3">
              Works on phone and tablet — pick from gallery or Files, or record a new clip.
            </p>
          </div>
        )}
      </div>

      {displayError && <p className="mt-2 text-sm text-red-400">{displayError}</p>}
    </div>
  )
}
