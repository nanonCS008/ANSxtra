import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseStageCrewVideoLink } from '@/lib/stageCrewVideoLink'
import { verifyStageCrewVideoLink } from '@/lib/verifyStageCrewVideoLink'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { url?: string }
    const raw = typeof body.url === 'string' ? body.url.trim() : ''
    if (!raw) {
      return NextResponse.json({ ok: false, error: 'Please paste a video link.' }, { status: 400 })
    }

    const parsed = parseStageCrewVideoLink(raw)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }

    const verified = await verifyStageCrewVideoLink(parsed)
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: verified.error }, { status: 422 })
    }

    return NextResponse.json({
      ok: true,
      provider: verified.provider,
      url: parsed.url,
    })
  } catch (err) {
    console.error('POST /api/applications/verify-video-link', err)
    return NextResponse.json(
      { ok: false, error: 'Could not verify the video link. Please try again.' },
      { status: 500 }
    )
  }
}
