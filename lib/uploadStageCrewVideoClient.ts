'use client'

import { createClient } from '@supabase/supabase-js'

import {
  buildStageCrewVideoPath,
  extensionForVideoMime,
  getStageCrewVideoPublicUrl,
  inferVideoContentType,
  STAGE_CREW_VIDEOS_BUCKET,
} from '@/lib/stageCrewVideo'

export type StageCrewVideoUploadResult = {
  storagePath: string
  publicUrl: string
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured for video uploads.')
  }
  return { url: url.replace(/\/$/, ''), anonKey }
}

async function prepareSignedUpload(
  file: File,
  userId: string
): Promise<{ storagePath: string; publicUrl: string; token: string }> {
  const res = await fetch('/api/applications/stage-crew-video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: inferVideoContentType(file),
    }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload?.error ?? 'Could not start upload.')
  }

  const storagePath =
    typeof payload?.storagePath === 'string' ? payload.storagePath : buildStageCrewVideoPath(userId, extensionForVideoMime(inferVideoContentType(file), file.name))
  const publicUrl = typeof payload?.publicUrl === 'string' ? payload.publicUrl : ''
  const token = typeof payload?.token === 'string' ? payload.token : ''

  if (!publicUrl || !token) {
    throw new Error('Upload setup failed. Please try again.')
  }

  return { storagePath, publicUrl, token }
}

/**
 * Upload directly from the browser to Supabase Storage.
 * Uses signed upload URL from our API (metadata only) — no SUPABASE_JWT_SECRET needed.
 */
export async function uploadStageCrewVideo(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<StageCrewVideoUploadResult> {
  const { url, anonKey } = getSupabaseConfig()
  const contentType = inferVideoContentType(file)

  onProgress?.(5)
  const { storagePath, publicUrl, token } = await prepareSignedUpload(file, userId)

  onProgress?.(15)

  const supabase = createClient(url, anonKey)
  const { error } = await supabase.storage
    .from(STAGE_CREW_VIDEOS_BUCKET)
    .uploadToSignedUrl(storagePath, token, file, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''
    if (message.includes('bucket') || message.includes('not found')) {
      throw new Error(
        'Video storage is not set up. Run supabase-storage-setup.sql in your Supabase project.'
      )
    }
    throw new Error(error.message || 'Upload failed.')
  }

  onProgress?.(100)

  return {
    storagePath,
    publicUrl: publicUrl || getStageCrewVideoPublicUrl(url, storagePath),
  }
}
