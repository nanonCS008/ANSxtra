import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import clubs from '@/data/clubs.json';
import { formatResendError, getResendClient, getResendFrom } from '@/lib/resendConfig';
import { buildStudentApplicationStatusEmailHtml } from '@/lib/email/studentApplicationStatusHtml';

export const dynamic = 'force-dynamic';

/** Shown in the student approval email “When we meet” block only (TEDx first meeting). */
const TEDX_APPROVAL_FIRST_MEETING = {
  meetingDay: 'Monday 8th June 2026',
  meetingTime: '12:50pm-1:15pm',
  location: 'Room 12-302',
} as const;

type UpdatePayload = {
  id?: string;
  ids?: string[];
  status?: 'approved' | 'rejected';
  notes?: string;
  /** Shown only in the student approval email (not stored on the row). Meeting time, room, next steps, etc. */
  acceptanceMessage?: string | null;
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function toTitleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SendNotificationResult = {
  failures: string[];
  missingStudentEmail: boolean;
};

async function sendStatusNotifications(params: {
  userId: string;
  clubId: string;
  status: 'approved' | 'rejected';
  notes: string | null;
  reviewedByEmail: string;
  acceptanceMessage?: string | null;
  /** From `applications_v2.email` at apply time; used if Auth email is missing. */
  applicationEmail?: string | null;
  /** Student nickname (Thai prename) captured on apply. */
  studentNickname?: string | null;
  /** Student name captured on apply (first + last). */
  studentFullName?: string | null;
}): Promise<SendNotificationResult> {
  const failures: string[] = [];
  const resend = getResendClient();
  const from = getResendFrom();

  if (!resend) {
    return { failures, missingStudentEmail: false };
  }

  const supabase = getAdminClient();
  const clubName = clubs.find((club) => club.id === params.clubId)?.name ?? toTitleCase(params.clubId);
  const clubMeta = clubs.find((club) => club.id === params.clubId);
  const isTedxApproval = params.clubId === 'tedx' && params.status === 'approved';
  const meetingDay = isTedxApproval
    ? TEDX_APPROVAL_FIRST_MEETING.meetingDay
    : (clubMeta?.meetingDay ?? null);
  const meetingTime = isTedxApproval
    ? TEDX_APPROVAL_FIRST_MEETING.meetingTime
    : (clubMeta?.meetingTime ?? null);
  const location = isTedxApproval ? TEDX_APPROVAL_FIRST_MEETING.location : (clubMeta?.location ?? null);
  const statusLabel = params.status === 'approved' ? 'Approved' : 'Rejected';
  const nickname = params.studentNickname?.trim() || '';
  const nicknameSuffix = nickname ? ` (${nickname})` : '';
  const fullName = params.studentFullName?.trim() || '';

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(params.userId);
  if (userError) {
    console.error('Failed to fetch user email for notification:', userError);
  }

  const authEmail = userData?.user?.email?.trim() || null;
  const storedEmail = params.applicationEmail?.trim() || null;
  const userEmail = authEmail || storedEmail;
  if (!authEmail && storedEmail) {
    console.warn('Using application row email for notification (Auth email missing):', params.userId);
  }

  const studentEmailHtml = buildStudentApplicationStatusEmailHtml({
    clubName,
    status: params.status,
    studentFullName: fullName || null,
    notes: params.notes,
    acceptanceMessage:
      params.status === 'approved' && params.acceptanceMessage?.trim()
        ? params.acceptanceMessage.trim()
        : null,
    meetingDay,
    meetingTime,
    location,
  });

  if (userEmail) {
    const { error } = await resend.emails.send({
      from,
      to: userEmail,
      subject: `${clubName} — Application ${statusLabel}${nicknameSuffix}`,
      html: studentEmailHtml,
    });
    if (error) {
      const detail = formatResendError(error);
      console.error('Resend student email failed:', detail);
      failures.push(`Student (${userEmail}): ${detail}`);
    }
  } else {
    const msg = `No student email (Auth + application row empty) for user_id ${params.userId}`;
    console.warn(msg);
    failures.push(msg);
  }

  return {
    failures,
    missingStudentEmail: !userEmail,
  };
}

async function authorizeAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isAdminEmail(session.user.email)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, session };
}

export async function GET() {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('applications_v2')
    .select('id,user_id,club_id,status,applied_at,reviewed_at,notes,student_id,first_name,last_name,prename,year,email,submitted_at,responses')
    .order('applied_at', { ascending: true });

  if (error) {
    console.error('Admin applications GET failed:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as UpdatePayload;
  const ids = Array.from(
    new Set((body.ids ?? []).map((value) => String(value).trim()).filter(Boolean))
  );
  const id = body.id?.trim();
  const status = body.status;
  const notes = body.notes?.trim() ?? null;
  const acceptanceMessage =
    status === 'approved' && typeof body.acceptanceMessage === 'string'
      ? body.acceptanceMessage.trim() || null
      : null;

  if ((!id && ids.length === 0) || !status || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  const targetIds = ids.length > 0 ? ids : [id!];
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('applications_v2')
    .update({
      status,
      notes,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', targetIds)
    .select('id,user_id,club_id,status,applied_at,reviewed_at,notes,student_id,first_name,last_name,prename,year,email,submitted_at,responses')


  if (error) {
    console.error('Admin applications PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }

  const updatedRows = data ?? [];
  if (updatedRows.length === 0) {
    return NextResponse.json({ error: 'No applications were updated' }, { status: 404 });
  }

  const resendConfigured = !!getResendClient();
  const fromUsed = getResendFrom();
  const failureSamples: string[] = [];
  let missingStudentEmailCount = 0;

  if (!resendConfigured) {
    failureSamples.push('RESEND_API_KEY is not set — no emails were sent.');
    console.warn('RESEND_API_KEY is not set; skipping application status emails.');
  } else {
    for (const row of updatedRows) {
      const first = (row as { first_name?: string | null }).first_name ?? '';
      const last = (row as { last_name?: string | null }).last_name ?? '';
      const fullName = `${String(first).trim()} ${String(last).trim()}`.trim() || null;
      const r = await sendStatusNotifications({
        userId: row.user_id,
        clubId: row.club_id,
        status: row.status as 'approved' | 'rejected',
        notes: row.notes,
        reviewedByEmail: auth.session.user.email?.trim() || '(unknown)',
        acceptanceMessage,
        applicationEmail: (row as { email?: string | null }).email ?? null,
        studentNickname: (row as { prename?: string | null }).prename ?? null,
        studentFullName: fullName,
      });
      if (r.missingStudentEmail) missingStudentEmailCount += 1;
      for (const f of r.failures) {
        if (failureSamples.length < 30) failureSamples.push(f);
      }
    }
  }

  const emailReport = {
    resendConfigured,
    fromUsed,
    failureSamples,
    missingStudentEmailCount,
    applicationsUpdated: updatedRows.length,
  };

  if (ids.length > 0) {
    return NextResponse.json({
      success: true,
      updatedCount: updatedRows.length,
      applications: updatedRows,
      emailReport,
    });
  }

  return NextResponse.json({
    application: updatedRows[0],
    emailReport,
  });
}
