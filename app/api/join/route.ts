import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import clubs from '@/data/clubs.json'
import crypto from 'crypto'
import { notifyApplicationCountMilestones } from '@/lib/applicationAdminEmails'
import { sendStudentApplicationReceivedEmail } from '@/lib/email/sendApplicationReceivedEmail'
import { parseStageCrewVideoLink } from '@/lib/stageCrewVideoLink'
import { getClubFormFields } from '@/lib/clubFormFields'
import { getExternalSignupMessage, isExternalSignupClub } from '@/lib/externalSignupClubs'

function getStudentIdFromEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  const at = normalized.indexOf('@')
  if (at <= 0) return null
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (domain !== 'student.amnuaysilpa.ac.th') return null
  return local || null
}

function normalizeYearGroup(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace('Y', '').trim(), 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const email = session.user.email
    if (!email) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const studentId = getStudentIdFromEmail(email)
    if (!studentId) {
      return NextResponse.json(
        { code: 'NOT_STUDENT', error: 'Account is not recognized as a valid student.' },
        { status: 403 }
      )
    }

    // Support both schemas:
    // - expected: students(student_id, year_group, first_name, surname, prename|nickname)
    // - legacy:   students(txtschoolcode, intncyear, txtforename, txtsurname, txtprename?)
    type StudentRow = {
      student_id?: string | null
      year_group?: number | null
      first_name?: string | null
      surname?: string | null
      prename?: string | null
      nickname?: string | null
      intncyear?: number | null
      txtforename?: string | null
      txtsurname?: string | null
      txtprename?: string | null
      txtschoolcode?: number | null
    }

    let studentRow: StudentRow | null = null
    let studentLookupError: any = null

    async function tryStudentSelect(select: string, column: 'student_id' | 'txtschoolcode', value: string | number) {
      const q = supabase.from('students').select(select)
      const res =
        column === 'student_id'
          ? await q.eq('student_id', value as string).maybeSingle()
          : await q.eq('txtschoolcode', value as number).maybeSingle()
      return res
    }

    {
      const expectedSelects = [
        'student_id,year_group,first_name,surname,prename,nickname',
        'student_id,year_group,first_name,surname',
      ]
      for (const sel of expectedSelects) {
        const res = await tryStudentSelect(sel, 'student_id', studentId)
        if (!res.error && res.data) {
          studentRow = res.data as StudentRow
          studentLookupError = null
          break
        }
        studentLookupError = res.error
        if (res.error?.code !== '42703') break
      }
    }

    // Schema mismatch: `student_id` / optional nickname columns missing → try legacy `txtschoolcode` row.
    if (!studentRow && studentLookupError?.code === '42703') {
      studentLookupError = null
      const code = parseInt(studentId, 10)
      if (!Number.isNaN(code)) {
        const legacySelects = [
          'txtschoolcode,intncyear,txtforename,txtsurname,txtprename',
          'txtschoolcode,intncyear,txtforename,txtsurname',
        ]
        for (const sel of legacySelects) {
          const res = await tryStudentSelect(sel, 'txtschoolcode', code)
          if (!res.error && res.data) {
            studentRow = res.data as StudentRow
            studentLookupError = null
            break
          }
          studentLookupError = res.error
          if (res.error?.code !== '42703') break
        }
      }
    }

    if (studentLookupError) {
      console.error('Error looking up student_id:', studentLookupError)
      return NextResponse.json(
        { code: 'STUDENT_LOOKUP_FAILED', error: 'Failed to verify student account' },
        { status: 500 }
      )
    }

    const yearGroupFromStudent =
      (studentRow as any)?.year_group ?? (studentRow as any)?.intncyear ?? null

    if (!yearGroupFromStudent) {
      return NextResponse.json(
        { code: 'NOT_STUDENT', error: 'Account is not recognized as a valid student.' },
        { status: 403 }
      )
    }

    const userYearGroup = normalizeYearGroup(yearGroupFromStudent)
    const studentFirstName =
      (studentRow?.first_name ?? studentRow?.txtforename ?? null) as string | null
    const studentLastName =
      (studentRow?.surname ?? studentRow?.txtsurname ?? null) as string | null
    const studentPrename =
      (studentRow?.prename ??
        studentRow?.nickname ??
        studentRow?.txtprename ??
        null) as string | null

    // Support both single clubId and array clubIds
    const clubIdsRaw = body.clubIds || (body.clubId ? [body.clubId] : [])
    const clubIds = Array.from(
      new Set(
        (Array.isArray(clubIdsRaw) ? clubIdsRaw : [clubIdsRaw])
          .map((value) => String(value).trim())
          .filter(Boolean)
      )
    )

    if (!clubIds.length) {
      return NextResponse.json(
        { code: 'MISSING_CLUB', error: 'Missing clubIds' },
        { status: 400 }
      )
    }

    const invalidClubIds = clubIds.filter((clubId) => !clubs.some((club) => club.id === clubId))
    if (invalidClubIds.length > 0) {
      return NextResponse.json(
        { code: 'CLUB_NOT_FOUND', error: 'Invalid clubIds provided', invalidClubIds },
        { status: 400 }
      )
    }

    if (userYearGroup == null) {
      return NextResponse.json(
        { code: 'MISSING_YEAR_GROUP', error: 'Missing year group for this student profile.' },
        { status: 400 }
      )
    }

    const ineligibleClubIds = clubIds.filter((clubId) => {
      const club = clubs.find((item) => item.id === clubId)
      if (!club) return true
      const min = club.yearGroupMin ?? 7
      const max = club.yearGroupMax ?? 13
      return userYearGroup < min || userYearGroup > max
    })

    if (ineligibleClubIds.length > 0) {
      const ineligibleClubs = clubs
        .filter((club) => ineligibleClubIds.includes(club.id))
        .map((club) => ({
          id: club.id,
          name: club.name,
          yearGroupMin: club.yearGroupMin ?? 7,
          yearGroupMax: club.yearGroupMax ?? 13,
        }))

      return NextResponse.json(
        {
          code: 'YEAR_NOT_ALLOWED',
          error: 'One or more selected clubs are not available for your year group',
          userYearGroup,
          ineligibleClubs,
        },
        { status: 403 }
      )
    }

    const applications = []
    const insertErrors: Array<{ clubId: string; error: unknown }> = []

    const responses = (body?.responses && typeof body.responses === 'object')
      ? body.responses
      : null
    const submittedAt = new Date().toISOString()
    const cancelToken = crypto.randomBytes(24).toString('base64url')

    if (process.env.NODE_ENV !== 'production') {
      console.log('POST /api/join', {
        userId: session.user.id,
        studentId,
        clubIds,
        hasResponses: !!responses && Object.keys(responses as any).length > 0,
      })
    }

    const { count: countBeforeRaw, error: countBeforeError } = await supabase
      .from('applications_v2')
      .select('*', { count: 'exact', head: true })
    const countBefore = typeof countBeforeRaw === 'number' ? countBeforeRaw : 0
    if (countBeforeError) {
      console.warn('POST /api/join: applications_v2 count failed (milestones skip):', countBeforeError)
    }

    for (const clubId of clubIds) {
      if (isExternalSignupClub(clubId)) {
        insertErrors.push({ clubId, error: { code: 'APPLICATIONS_DISABLED' } })
        continue
      }

      if (clubId === 'school-show') {
        const responseMap =
          responses && typeof responses === 'object' && !Array.isArray(responses)
            ? (responses as Record<string, unknown>)
            : {}
        const videoUrlFromBody =
          typeof (body as { video_url?: string }).video_url === 'string'
            ? String((body as { video_url?: string }).video_url).trim()
            : ''
        const videoUrlFromResponses =
          typeof responseMap.video_submission === 'string'
            ? responseMap.video_submission.trim()
            : ''
        const videoUrlRaw = videoUrlFromBody || videoUrlFromResponses
        const parsedVideo = videoUrlRaw ? parseStageCrewVideoLink(videoUrlRaw) : null
        let schoolShowInvalid = false
        if (!parsedVideo?.ok) {
          schoolShowInvalid = true
          insertErrors.push({ clubId, error: { code: 'INVALID_VIDEO' } })
        }
        if (!schoolShowInvalid) {
          for (const field of getClubFormFields(clubId)) {
            if (!field.required || field.kind === 'video') continue
            const val = responseMap[field.key]
            const empty =
              val == null ||
              (typeof val === 'string' && !val.trim()) ||
              (Array.isArray(val) && val.length === 0)
            if (empty) {
              schoolShowInvalid = true
              insertErrors.push({ clubId, error: { code: 'INVALID_RESPONSES' } })
              break
            }
          }
        }
        if (schoolShowInvalid) continue
      }

      // Check if application already exists
      const { data: existing } = await supabase
        .from('applications_v2')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('club_id', clubId)
        .single()

      if (existing) {
        insertErrors.push({ clubId, error: { code: 'ALREADY_APPLIED' } })
        continue
      }

      const schoolShowVideoRaw =
        clubId === 'school-show'
          ? typeof (body as { video_url?: string }).video_url === 'string'
            ? String((body as { video_url?: string }).video_url).trim()
            : typeof (responses as Record<string, unknown>)?.video_submission === 'string'
              ? String((responses as Record<string, unknown>).video_submission).trim()
              : ''
          : ''
      const schoolShowVideoParsed =
        clubId === 'school-show' && schoolShowVideoRaw
          ? parseStageCrewVideoLink(schoolShowVideoRaw)
          : null
      const schoolShowVideoUrl =
        schoolShowVideoParsed?.ok === true ? schoolShowVideoParsed.url : null

      const responsesPayload =
        clubId === 'school-show' && schoolShowVideoUrl
          ? {
              ...(responses && typeof responses === 'object' && !Array.isArray(responses)
                ? (responses as Record<string, unknown>)
                : {}),
              video_submission: schoolShowVideoUrl,
            }
          : responses

      // Create application
      const { data, error } = await supabase
        .from('applications_v2')
        .insert({
          user_id: session.user.id,
          club_id: clubId,
          student_id: studentId,
          first_name: studentFirstName,
          last_name: studentLastName,
          prename: studentPrename,
          year: userYearGroup,
          email: session.user.email,
          submitted_at: submittedAt,
          responses: responsesPayload,
          cancel_token: cancelToken,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating application:', { clubId, error })
        insertErrors.push({ clubId, error })
        continue
      }

      applications.push(data)
    }

    if (applications.length === 0) {
      const first = insertErrors[0]?.error as any
      if (first?.code === 'ALREADY_APPLIED') {
        return NextResponse.json(
          { code: 'ALREADY_APPLIED', error: 'You already applied.' },
          { status: 409 }
        )
      }
      if (first?.code === 'APPLICATIONS_DISABLED') {
        const disabledClubId = insertErrors[0]?.clubId ?? 'student-council'
        return NextResponse.json(
          {
            code: 'APPLICATIONS_DISABLED',
            message: getExternalSignupMessage(disabledClubId),
          },
          { status: 403 }
        )
      }
      if (first?.code === 'INVALID_VIDEO') {
        return NextResponse.json(
          {
            code: 'INVALID_VIDEO',
            message:
              typeof first?.message === 'string'
                ? first.message
                : 'Please add a valid public YouTube or Google Drive link to your introduction video.',
          },
          { status: 400 }
        )
      }

      // Most common: schema mismatch (missing column), constraint errors, etc.
      const message =
        typeof first?.message === 'string'
          ? first.message
          : 'Failed to create application.'
      return NextResponse.json(
        { code: 'INSERT_FAILED', message, details: insertErrors },
        { status: 500 }
      )
    }

    if (applications.length > 0) {
      const { count: countAfterRaw, error: countAfterError } = await supabase
        .from('applications_v2')
        .select('*', { count: 'exact', head: true })
      const countAfter =
        typeof countAfterRaw === 'number' ? countAfterRaw : countBefore + applications.length
      if (countAfterError) {
        console.warn('POST /api/join: post-insert count failed; milestone check may be off:', countAfterError)
      }
      notifyApplicationCountMilestones(supabase, countBefore, countAfter).catch((err) => {
        console.error('Milestone admin email error:', err)
      })

      try {
        const sent = await sendStudentApplicationReceivedEmail({
          to: email,
          studentFirstName: studentFirstName?.trim() || null,
          applicationRows: applications,
          responses,
        })
        if (!sent.ok) {
          console.warn('Student application confirmation email failed:', sent.error)
        }
      } catch (confirmErr) {
        console.error('Student application confirmation email error:', confirmErr)
      }
    }

    return NextResponse.json(
      { code: 'OK', applications },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing join request:', error)
    return NextResponse.json(
      { code: 'SERVER_ERROR', error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

