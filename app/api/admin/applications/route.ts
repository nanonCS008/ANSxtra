import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { getAdminEmails, isAdminEmail } from '@/lib/admin';
import clubs from '@/data/clubs.json';
import { formatResendError, getResendClient, getResendFrom, getEmailBrandLogoImgHtml } from '@/lib/resendConfig';

export const dynamic = 'force-dynamic';

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

function shouldSendAdminCopyEmails(): boolean {
  const raw = process.env.SEND_ADMIN_COPY_EMAILS?.trim().toLowerCase();
  if (!raw) return false;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

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
  const adminRecipients = shouldSendAdminCopyEmails() ? getAdminEmails() : [];

  const extraApproval =
    params.status === 'approved' && params.acceptanceMessage?.trim()
      ? `<div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0;">
          <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Message from club leader</div>
          <div style="white-space:pre-wrap;color:#0f172a;line-height:1.55;">${escapeHtml(params.acceptanceMessage.trim())}</div>
        </div>`
      : '';

  const logoHtml = getEmailBrandLogoImgHtml();

  if (userEmail) {
    const { error } = await resend.emails.send({
      from,
      to: userEmail,
      subject: `${clubName} — Application ${statusLabel}${nicknameSuffix}`,
      html: `
          <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:640px;margin:0 auto;padding:4px 0;">
            <div style="padding:18px 18px 14px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;">
              ${logoHtml}
              <div style="font-size:20px;font-weight:800;color:#0f172a;">${escapeHtml(clubName)} — Application ${statusLabel}</div>
              <div style="margin-top:12px;font-size:14px;color:#0f172a;line-height:1.6;">
                ${fullName ? `<div style="margin-bottom:6px;">Hi <strong>${escapeHtml(fullName)}</strong>,</div>` : ''}
                <div>Your application status is: <strong>${statusLabel}</strong>.</div>
              </div>
              ${params.notes ? `<div style="margin-top:14px;padding:12px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
                <div style="font-weight:700;color:#7c2d12;margin-bottom:6px;">Notes</div>
                <div style="color:#7c2d12;white-space:pre-wrap;line-height:1.5;">${escapeHtml(params.notes)}</div>
              </div>` : ''}
              ${extraApproval}
              <div style="margin-top:16px;font-size:13px;color:#64748b;">
                You can check your status anytime in <strong>My Applications</strong>.
              </div>
            </div>
          </div>
        `,
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

  if (adminRecipients.length) {
    const { error } = await resend.emails.send({
      from,
      to: adminRecipients,
      subject: `${clubName} — Application ${statusLabel}${nicknameSuffix} (admin copy)`,
      html: `
          <h2>Application Review Completed</h2>
          <p><strong>Club:</strong> ${clubName}</p>
          <p><strong>Status:</strong> ${statusLabel}</p>
          <p><strong>User ID:</strong> ${params.userId}</p>
          <p><strong>Reviewed by:</strong> ${params.reviewedByEmail}</p>
          ${params.notes ? `<p><strong>Notes:</strong> ${escapeHtml(params.notes)}</p>` : ''}
        `,
    });
    if (error) {
      const detail = formatResendError(error);
      console.error('Resend admin email failed:', detail);
      failures.push(`Admin copy: ${detail}`);
    }
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
