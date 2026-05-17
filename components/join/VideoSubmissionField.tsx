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
import { cn } from '@/lib/utils/cn'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

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

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video length. Try another file or re-export as MP4.'))
        return
      }
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this video file.'))
    }
    video.src = url
  })
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
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [durationLabel, setDurationLabel] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'uploading' | 'done' | 'error'>(
    value ? 'done' : 'idle'
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const displayError = error ?? localError

  useEffect(() => {
    if (value) {
      setStatus('done')
      setLocalError(null)
    } else if (status === 'done') {
      setStatus('idle')
      setFileLabel(null)
      setDurationLabel(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to parent value clearing
  }, [value])

  useEffect(() => {
    onUploadingChange?.(status === 'checking' || status === 'uploading')
  }, [status, onUploadingChange])

  const resetSelection = useCallback(() => {
    onChange('')
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
        setLocalError('Please choose a video file (not a photo). On iPhone, pick a video from your library or record a new one.')
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
      setUploadProgress('Preparing upload…')

      try {
        const prepareRes = await fetch('/api/applications/video-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clubId,
            fileName: file.name,
            fileSize: file.size,
            contentType,
          }),
        })
        const preparePayload = await prepareRes.json().catch(() => ({}))
        if (!prepareRes.ok) {
          throw new Error(preparePayload?.error ?? 'Could not start upload.')
        }

        const { uploadUrl, publicUrl, token } = preparePayload as {
          uploadUrl?: string
          publicUrl?: string
          token?: string
        }
        if (!uploadUrl || !publicUrl) {
          throw new Error('Upload setup failed. Please try again.')
        }

        setUploadProgress('Uploading video…')

        const signedTarget = new URL(uploadUrl)
        if (token && !signedTarget.searchParams.has('token')) {
          signedTarget.searchParams.set('token', token)
        }

        const formData = new FormData()
        formData.append('cacheControl', '3600')
        formData.append('', file, file.name || 'video.mp4')

        const uploadRes = await fetch(signedTarget.toString(), {
          method: 'PUT',
          headers: { 'x-upsert': 'false' },
          body: formData,
        })

        if (!uploadRes.ok) {
          const detail = await uploadRes.text().catch(() => '')
          console.error('Video storage upload failed:', uploadRes.status, detail)
          throw new Error('Upload failed. Check your connection and try again.')
        }

        onChange(publicUrl)
        setStatus('done')
        setUploadProgress(null)
        queueMicrotask(() => onBlur?.())
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Upload failed.')
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

      {helper && (
        <p className="text-white/55 text-sm leading-relaxed mb-3">{helper}</p>
      )}

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

      <div
        className={cn(
          'rounded-xl border border-dashed p-4 md:p-5 transition-colors',
          displayError ? 'border-red-500/40 bg-red-500/5' : 'border-white/15 bg-brand-navy/40',
          status === 'done' && !displayError && 'border-brand-pink/35 bg-brand-pink/5'
        )}
      >
        {status === 'done' && value ? (
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
