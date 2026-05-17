import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import {
  buildStageCrewVideoPath,
  extensionForVideoMime,
  getStageCrewVideoPublicUrl,
  resolveVideoContentType,
  STAGE_CREW_VIDEO_MAX_BYTES,
  STAGE_CREW_VIDEO_MIME_TYPES,
  STAGE_CREW_VIDEOS_BUCKET,
} from '@/lib/stageCrewVideo'

export const dynamic = 'force-dynamic'

type PrepareBody = {
  fileName?: string
  fileSize?: number
  contentType?: string
}

/**
 * Returns a signed upload URL + token (JSON only — no video file).
 * The browser uploads directly to Supabase Storage using uploadToSignedUrl.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Video storage is not configured.' }, { status: 500 })
    }

    const body = (await request.json()) as PrepareBody
    const fileName = String(body.fileName ?? '').trim()
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize)
    const contentType = resolveVideoContentType(String(body.contentType ?? ''), fileName)

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size.' }, { status: 400 })
    }
    if (fileSize > STAGE_CREW_VIDEO_MAX_BYTES) {
      return NextResponse.json(
        { error: `Video must be under ${Math.round(STAGE_CREW_VIDEO_MAX_BYTES / (1024 * 1024))} MB.` },
        { status: 400 }
      )
    }
    if (!STAGE_CREW_VIDEO_MIME_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'Please upload a video file (MP4, MOV, or WebM).' }, { status: 400 })
    }

    const ext = extensionForVideoMime(contentType, fileName)
    const storagePath = buildStageCrewVideoPath(session.user.id, ext)

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase.storage
      .from(STAGE_CREW_VIDEOS_BUCKET)
      .createSignedUploadUrl(storagePath)

    if (error || !data?.token) {
      console.error('createSignedUploadUrl failed:', error)
      return NextResponse.json(
        {
          error:
            'Could not prepare upload. Run supabase-storage-setup.sql to create the stage-crew-videos bucket.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      storagePath,
      publicUrl: getStageCrewVideoPublicUrl(supabaseUrl, storagePath),
      token: data.token,
    })
  } catch (err) {
    console.error('POST /api/applications/stage-crew-video-upload', err)
    return NextResponse.json({ error: 'Failed to prepare video upload.' }, { status: 500 })
  }
}
