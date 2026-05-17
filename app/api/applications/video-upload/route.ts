import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import {
  APPLICATION_VIDEO_MAX_BYTES,
  APPLICATION_VIDEO_MIME_TYPES,
  APPLICATION_VIDEOS_BUCKET,
  buildApplicationVideoStoragePath,
  extensionForVideoMime,
  getPublicVideoUrl,
  resolveVideoContentType,
} from '@/lib/applicationVideo'

export const dynamic = 'force-dynamic'

type PrepareBody = {
  clubId?: string
  fileName?: string
  fileSize?: number
  contentType?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { code: 'STORAGE_NOT_CONFIGURED', error: 'Video storage is not configured.' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as PrepareBody
    const clubId = String(body.clubId ?? '').trim()
    const fileName = String(body.fileName ?? '').trim()
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize)
    const contentType = resolveVideoContentType(
      String(body.contentType ?? ''),
      fileName
    )

    if (!clubId) {
      return NextResponse.json({ code: 'MISSING_CLUB', error: 'Missing clubId' }, { status: 400 })
    }

    if (clubId !== 'school-show') {
      return NextResponse.json(
        { code: 'CLUB_NOT_SUPPORTED', error: 'Video upload is not enabled for this club.' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ code: 'INVALID_FILE', error: 'Invalid file size.' }, { status: 400 })
    }

    if (fileSize > APPLICATION_VIDEO_MAX_BYTES) {
      return NextResponse.json(
        {
          code: 'FILE_TOO_LARGE',
          error: `Video must be under ${Math.round(APPLICATION_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`,
        },
        { status: 400 }
      )
    }

    if (!APPLICATION_VIDEO_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          code: 'INVALID_FILE_TYPE',
          error: 'Please upload a video file (MP4, MOV, or WebM). Photos are not accepted for this question.',
        },
        { status: 400 }
      )
    }

    const ext = extensionForVideoMime(contentType, fileName)
    const path = buildApplicationVideoStoragePath(clubId, session.user.id, ext)

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase.storage
      .from(APPLICATION_VIDEOS_BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data?.signedUrl) {
      console.error('createSignedUploadUrl failed:', error)
      return NextResponse.json(
        {
          code: 'UPLOAD_URL_FAILED',
          error:
            'Could not prepare video upload. Ensure the application-videos bucket exists in Supabase (see supabase-storage-setup.sql).',
        },
        { status: 500 }
      )
    }

    const publicUrl = getPublicVideoUrl(supabaseUrl, path)

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl,
    })
  } catch (err) {
    console.error('POST /api/applications/video-upload', err)
    return NextResponse.json({ code: 'UNKNOWN', error: 'Failed to prepare video upload.' }, { status: 500 })
  }
}
