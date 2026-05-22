import clubs from '@/data/clubs.json';
import { getClubEmailDisplayName } from '@/lib/email/clubEmailDisplayNames';
import { getResendEmailDelayMs, isResendRateLimitError, sleep } from '@/lib/email/resendThrottle';
import { buildStudentApplicationStatusEmailHtml } from '@/lib/email/studentApplicationStatusHtml';
import { formatResendError, getResendClient, getResendFrom } from '@/lib/resendConfig';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BATCH_SIZE = 100;
const MAX_SEND_RETRIES = 4;

export type ApplicationRowForEmail = {
  user_id: string;
  club_id: string;
  status: 'approved' | 'rejected';
  notes: string | null;
  first_name?: string | null;
  last_name?: string | null;
  prename?: string | null;
  email?: string | null;
};

export type BulkStatusEmailReport = {
  failures: string[];
  missingStudentEmailCount: number;
  emailsSent: number;
  emailsFailed: number;
};

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function toTitleCase(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

type PreparedEmail = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

async function resolveStudentEmail(
  supabase: SupabaseClient,
  userId: string,
  applicationEmail?: string | null
): Promise<string | null> {
  const stored = applicationEmail?.trim() || null;
  if (stored) return stored;

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError) {
    console.error('Failed to fetch user email for notification:', userError);
    return null;
  }
  return userData?.user?.email?.trim() || null;
}

function prepareStatusEmail(
  row: ApplicationRowForEmail,
  from: string,
  acceptanceMessage?: string | null
): PreparedEmail | null {
  const clubNameRaw =
    clubs.find((club) => club.id === row.club_id)?.name ?? toTitleCase(row.club_id);
  const clubName = getClubEmailDisplayName(row.club_id, clubNameRaw);
  const statusLabel = row.status === 'approved' ? 'Approved' : 'Rejected';
  const nickname = row.prename?.trim() || '';
  const nicknameSuffix = nickname ? ` (${nickname})` : '';
  const first = row.first_name ?? '';
  const last = row.last_name ?? '';
  const fullName = `${String(first).trim()} ${String(last).trim()}`.trim() || null;

  const html = buildStudentApplicationStatusEmailHtml({
    clubName,
    clubId: row.club_id,
    status: row.status,
    studentFullName: fullName,
    notes: row.notes,
    acceptanceMessage:
      row.status === 'approved' && acceptanceMessage?.trim() ? acceptanceMessage.trim() : null,
  });

  return {
    from,
    to: '', // filled after resolve
    subject: `${clubName} — Application ${statusLabel}${nicknameSuffix}`,
    html,
  };
}

async function sendSingleWithRetry(
  resend: NonNullable<ReturnType<typeof getResendClient>>,
  email: PreparedEmail
): Promise<{ ok: boolean; error?: string }> {
  const delayMs = getResendEmailDelayMs();

  for (let attempt = 0; attempt <= MAX_SEND_RETRIES; attempt++) {
    const { error } = await resend.emails.send({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });

    if (!error) return { ok: true };

    const detail = formatResendError(error);
    if (attempt < MAX_SEND_RETRIES && isResendRateLimitError(detail)) {
      const wait = delayMs * (attempt + 2);
      console.warn(`Resend rate limit for ${email.to}, retry in ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }

    return { ok: false, error: detail };
  }

  return { ok: false, error: 'max retries exceeded' };
}

async function sendBatchChunk(
  resend: NonNullable<ReturnType<typeof getResendClient>>,
  emails: PreparedEmail[],
  failureSamples: string[],
  maxFailureSamples: number
): Promise<{ sent: number; failed: number }> {
  const payload = emails.map((e) => ({
    from: e.from,
    to: e.to,
    subject: e.subject,
    html: e.html,
  }));

  const delayMs = getResendEmailDelayMs();

  for (let attempt = 0; attempt <= MAX_SEND_RETRIES; attempt++) {
    const { data, error } = await resend.batch.send(payload, { batchValidation: 'permissive' });

    if (!error) {
      const ids = data?.data ?? [];
      const batchErrors =
        (data as { errors?: { index: number; message: string }[] } | null)?.errors ?? [];

      for (const err of batchErrors) {
        const to = emails[err.index]?.to ?? `index ${err.index}`;
        if (failureSamples.length < maxFailureSamples) {
          failureSamples.push(`Student (${to}): ${err.message}`);
        }
      }

      return { sent: ids.length, failed: batchErrors.length };
    }

    const detail = formatResendError(error);
    if (attempt < MAX_SEND_RETRIES && isResendRateLimitError(detail)) {
      const wait = delayMs * (attempt + 2);
      console.warn(`Resend batch rate limit, retry in ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }

    console.error('Resend batch send failed:', detail);
    for (const e of emails) {
      if (failureSamples.length < maxFailureSamples) {
        failureSamples.push(`Batch (${e.to}): ${detail}`);
      }
    }
    return { sent: 0, failed: emails.length };
  }

  return { sent: 0, failed: emails.length };
}

/**
 * Sends approval/rejection emails with Resend batch API (100 per request) and throttling
 * between batches/retries to avoid 429 rate limits and serverless timeouts.
 */
export async function sendBulkApplicationStatusEmails(params: {
  rows: ApplicationRowForEmail[];
  acceptanceMessage?: string | null;
}): Promise<BulkStatusEmailReport> {
  const failures: string[] = [];
  const maxFailureSamples = 30;
  let missingStudentEmailCount = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  const resend = getResendClient();
  if (!resend) {
    return { failures, missingStudentEmailCount, emailsSent, emailsFailed };
  }

  const from = getResendFrom();
  const supabase = getAdminClient();
  const delayMs = getResendEmailDelayMs();
  const prepared: PreparedEmail[] = [];

  for (const row of params.rows) {
    const template = prepareStatusEmail(row, from, params.acceptanceMessage);
    if (!template) {
      missingStudentEmailCount += 1;
      continue;
    }

    const to = await resolveStudentEmail(supabase, row.user_id, row.email);
    if (!to) {
      missingStudentEmailCount += 1;
      if (failures.length < maxFailureSamples) {
        failures.push(`No student email for user_id ${row.user_id}`);
      }
      continue;
    }

    prepared.push({ ...template, to });

    // Light throttle when we must hit Auth API (no email on application row)
    if (!row.email?.trim() && delayMs > 0) {
      await sleep(Math.min(delayMs, 150));
    }
  }

  if (prepared.length === 0) {
    return { failures, missingStudentEmailCount, emailsSent, emailsFailed };
  }

  // Prefer batch API (1 request per 100 emails); fall back to sequential if batch unavailable
  const useBatch = typeof resend.batch?.send === 'function';

  if (useBatch) {
    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const chunk = prepared.slice(i, i + BATCH_SIZE);
      const result = await sendBatchChunk(resend, chunk, failures, maxFailureSamples);
      emailsSent += result.sent;
      emailsFailed += result.failed;

      if (i + BATCH_SIZE < prepared.length && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  } else {
    for (let i = 0; i < prepared.length; i++) {
      const email = prepared[i];
      const result = await sendSingleWithRetry(resend, email);
      if (result.ok) emailsSent += 1;
      else {
        emailsFailed += 1;
        if (failures.length < maxFailureSamples) {
          failures.push(`Student (${email.to}): ${result.error ?? 'send failed'}`);
        }
      }
      if (i < prepared.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  return { failures, missingStudentEmailCount, emailsSent, emailsFailed };
}
