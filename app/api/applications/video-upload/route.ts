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
export const runtime = 'nodejs'
export const maxDuration = 120

type PrepareBody = {
  clubId?: string
  fileName?: string
  fileSize?: number
  contentType?: string
}

function getStorageAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return null
  }
  return { supabase: createClient(supabaseUrl, serviceKey), supabaseUrl }
}

function validateClubAndFile(
  clubId: string,
  fileName: string,
  fileSize: number,
  contentType: string
): NextResponse | null {
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

  return null
}

/** Multipart upload through our server (avoids browser CORS issues with Supabase). */
async function handleDirectUpload(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Unauthorized' }, { status: 401 })
  }

  const storage = getStorageAdmin()
  if (!storage) {
    return NextResponse.json(
      { code: 'STORAGE_NOT_CONFIGURED', error: 'Video storage is not configured.' },
      { status: 500 }
    )
  }

  const form = await request.formData()
  const file = form.get('file')
  const clubId = String(form.get('clubId') ?? '').trim()
  const fileName = file instanceof File ? file.name : String(form.get('fileName') ?? '').trim()
  const contentType = resolveVideoContentType(
    file instanceof File ? file.type : String(form.get('contentType') ?? ''),
    fileName
  )
  const fileSize = file instanceof File ? file.size : Number(form.get('fileSize'))

  if (!(file instanceof File)) {
    return NextResponse.json({ code: 'INVALID_FILE', error: 'No video file received.' }, { status: 400 })
  }

  const validationError = validateClubAndFile(clubId, fileName, fileSize, contentType)
  if (validationError) return validationError

  const ext = extensionForVideoMime(contentType, fileName)
  const storagePath = buildApplicationVideoStoragePath(clubId, session.user.id, ext)
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error } = await storage.supabase.storage
    .from(APPLICATION_VIDEOS_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Direct video upload failed:', error)
    return NextResponse.json(
      {
        code: 'UPLOAD_FAILED',
        error:
          error.message?.includes('Bucket not found') || error.message?.includes('bucket')
            ? 'Video storage is not set up. Run supabase-storage-setup.sql in your Supabase project.'
            : 'Could not save your video. Please try again.',
      },
      { status: 500 }
    )
  }

  const publicUrl = getPublicVideoUrl(storage.supabaseUrl, storagePath)

  return NextResponse.json({
    publicUrl,
    storagePath,
    mode: 'direct',
  })
}

/** Return signed-upload credentials for large files (client uploads with Supabase JS). */
async function handlePrepareSigned(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Unauthorized' }, { status: 401 })
  }

  const storage = getStorageAdmin()
  if (!storage) {
    return NextResponse.json(
      { code: 'STORAGE_NOT_CONFIGURED', error: 'Video storage is not configured.' },
      { status: 500 }
    )
  }

  const body = (await request.json()) as PrepareBody
  const clubId = String(body.clubId ?? '').trim()
  const fileName = String(body.fileName ?? '').trim()
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : Number(body.fileSize)
  const contentType = resolveVideoContentType(String(body.contentType ?? ''), fileName)

  const validationError = validateClubAndFile(clubId, fileName, fileSize, contentType)
  if (validationError) return validationError

  const ext = extensionForVideoMime(contentType, fileName)
  const storagePath = buildApplicationVideoStoragePath(clubId, session.user.id, ext)

  const { data, error } = await storage.supabase.storage
    .from(APPLICATION_VIDEOS_BUCKET)
    .createSignedUploadUrl(storagePath)

  if (error || !data?.signedUrl || !data.token) {
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

  const publicUrl = getPublicVideoUrl(storage.supabaseUrl, storagePath)

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    storagePath: data.path ?? storagePath,
    publicUrl,
    mode: 'signed',
  })
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('multipart/form-data')) {
      return handleDirectUpload(request)
    }
    return handlePrepareSigned(request)
  } catch (err) {
    console.error('POST /api/applications/video-upload', err)
    return NextResponse.json({ code: 'UNKNOWN', error: 'Failed to upload video.' }, { status: 500 })
  }
}
