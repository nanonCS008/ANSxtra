import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { signSupabaseAccessToken } from '@/lib/supabaseAccessToken'

export const dynamic = 'force-dynamic'

/** Issues a short-lived Supabase JWT for Storage uploads (no file bytes through this route). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access_token = signSupabaseAccessToken(session.user.id, session.user.email ?? null)

    return NextResponse.json({
      access_token,
      user_id: session.user.id,
    })
  } catch (err) {
    console.error('GET /api/auth/supabase-session', err)
    return NextResponse.json(
      { error: 'Could not prepare storage session. Check SUPABASE_JWT_SECRET in server env.' },
      { status: 500 }
    )
  }
}
