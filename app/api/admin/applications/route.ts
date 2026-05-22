import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { sendBulkApplicationStatusEmails } from '@/lib/email/sendApplicationStatusEmails';
import { getResendClient, getResendFrom } from '@/lib/resendConfig';

export const dynamic = 'force-dynamic';
/** Bulk approval can send many emails; allow up to 5 minutes on Vercel Pro (Hobby caps at 60s). */
export const maxDuration = 300;

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
    .select(
      'id,user_id,club_id,status,applied_at,reviewed_at,notes,student_id,first_name,last_name,prename,year,email,submitted_at,responses'
    )
    .order('applied_at', { ascending: true });

  if (error) {
    console.error('Admin applications GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications', details: error.message },
      { status: 500 }
    );
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
    .select(
      'id,user_id,club_id,status,applied_at,reviewed_at,notes,student_id,first_name,last_name,prename,year,email,submitted_at,responses'
    );

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
  let failureSamples: string[] = [];
  let missingStudentEmailCount = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  if (!resendConfigured) {
    failureSamples = ['RESEND_API_KEY is not set — no emails were sent.'];
    console.warn('RESEND_API_KEY is not set; skipping application status emails.');
  } else {
    const report = await sendBulkApplicationStatusEmails({
      rows: updatedRows.map((row) => ({
        user_id: row.user_id,
        club_id: row.club_id,
        status: row.status as 'approved' | 'rejected',
        notes: row.notes,
        first_name: (row as { first_name?: string | null }).first_name,
        last_name: (row as { last_name?: string | null }).last_name,
        prename: (row as { prename?: string | null }).prename,
        email: (row as { email?: string | null }).email,
      })),
      acceptanceMessage,
    });
    failureSamples = report.failures;
    missingStudentEmailCount = report.missingStudentEmailCount;
    emailsSent = report.emailsSent;
    emailsFailed = report.emailsFailed;
  }

  const emailReport = {
    resendConfigured,
    fromUsed,
    failureSamples,
    missingStudentEmailCount,
    applicationsUpdated: updatedRows.length,
    emailsSent,
    emailsFailed,
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
