import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import clubs from '@/data/clubs.json'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function pickClubIds(): string[] {
  const ids = (clubs as Array<{ id: string }>).map((c) => c.id).filter((id) => id !== 'blank' && id !== 'school-show')
  // Keep this small but varied.
  return ids.slice(0, 8)
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getAdminClient()
  const now = new Date()
  const clubIds = pickClubIds()

  const rows = clubIds.map((clubId, i) => ({
    user_id: session.user.id,
    club_id: clubId,
    student_id: session.user.email?.split('@')[0] ?? '00000',
    first_name: (session.user.name ?? 'Test').split(' ')[0] ?? 'Test',
    last_name: (session.user.name ?? 'Student').split(' ').slice(1).join(' ') || 'Student',
    prename: 'Mock',
    year: 10 + (i % 4), // 10-13
    email: session.user.email,
    submitted_at: now.toISOString(),
    responses: { seeded: true, note: 'mock row' },
    cancel_token: `seed-${now.getTime()}`,
    status: i % 7 === 0 ? 'rejected' : i % 3 === 0 ? 'pending' : 'approved',
    applied_at: new Date(now.getTime() - i * 36e5).toISOString(),
    reviewed_at: null,
    notes: null,
  }))

  const { data, error } = await supabase
    .from('applications_v2')
    .upsert(rows, { onConflict: 'user_id,club_id' })
    .select('id,club_id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    insertedOrUpdated: data?.length ?? 0,
  })
}

