import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getApplicationPeriodDigestKey,
  getApplicationPeriodEndDate,
} from '@/lib/applicationPeriod';
import clubs from '@/data/clubs.json';
import { getAdminEmails } from '@/lib/admin';
import { formatResendError, getResendClient, getResendFrom } from '@/lib/resendConfig';

const DEFAULT_MILESTONES = [100, 200, 300, 400, 500, 750, 1000];

/** Comma-separated list, e.g. `100,200,300` */
export function parseApplicationMilestones(): number[] {
  const raw = process.env.APPLICATION_COUNT_MILESTONES?.trim();
  const parsed =
    raw && raw.length > 0
      ? raw
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      : DEFAULT_MILESTONES;
  const unique = [...new Set(parsed)].sort((a, b) => a - b);
  return unique.length ? unique : DEFAULT_MILESTONES;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clubDisplayName(slug: string): string {
  const c = clubs.find((x) => x.id === slug);
  return (c?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())).trim();
}

type AppRowBrief = {
  club_id: string;
  first_name?: string | null;
  last_name?: string | null;
  prename?: string | null;
  year?: number | null;
  email?: string | null;
  status?: string | null;
};

function formatApplicantLine(row: AppRowBrief): string {
  const fn = String(row.first_name ?? '').trim();
  const ln = String(row.last_name ?? '').trim();
  const pn = String(row.prename ?? '').trim();
  const primary = `${fn} ${ln}`.trim();
  const label = primary ? (pn && pn !== primary ? `${primary} (${pn})` : primary) : pn;
  const email = String(row.email ?? '').trim();
  const fallback = email || 'Unknown name';
  const yearBit = row.year != null ? ` — Y${row.year}` : '';
  return escapeHtml((label || fallback) + yearBit);
}

export function milestonesCrossed(
  beforeInclusive: number,
  afterInclusive: number,
  milestones: number[]
): number[] {
  if (afterInclusive <= beforeInclusive) return [];
  const crossed: number[] = [];
  for (const m of milestones) {
    if (beforeInclusive < m && afterInclusive >= m) crossed.push(m);
  }
  return crossed;
}

async function digestAlreadyRecorded(admin: SupabaseClient, digestKey: string): Promise<boolean> {
  const { data, error } = await admin
    .from('application_admin_digest_log')
    .select('digest_key')
    .eq('digest_key', digestKey)
    .maybeSingle();

  if (error) {
    console.warn(
      '[admin email] Cannot read application_admin_digest_log (create table in Supabase?):',
      error.message
    );
    return false;
  }
  return !!data;
}

async function recordDigest(admin: SupabaseClient, digestKey: string): Promise<void> {
  const { error } = await admin.from('application_admin_digest_log').insert({ digest_key: digestKey });
  if (error?.code === '23505') return;
  if (error) console.error('[admin email] Cannot record digest log:', error.message);
}

/** Call after successful new application inserts — compares totals before vs after this request. */
export async function notifyApplicationCountMilestones(
  admin: SupabaseClient,
  countBefore: number,
  countAfter: number
): Promise<{ sent: boolean; crossed: number[]; error?: string }> {
  const crossed = milestonesCrossed(countBefore, countAfter, parseApplicationMilestones());
  if (crossed.length === 0) return { sent: false, crossed: [] };

  const recipients = getAdminEmails();
  if (!recipients.length) {
    console.warn(
      '[admin email] APPLICATION_COUNT_MILESTONES crossed but ADMIN_EMAILS is empty; skipping milestone email.'
    );
    return { sent: false, crossed, error: 'no_admin_emails' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('[admin email] RESEND_API_KEY not set; skipping milestone email.');
    return { sent: false, crossed, error: 'no_resend' };
  }

  const milestonesList = crossed.map((m) => `<li><strong>${m}</strong> total applications</li>`).join('');
  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: recipients,
    subject:
      crossed.length === 1
        ? `[ANSxtra] Application milestone: ${crossed[0]} total`
        : `[ANSxtra] Application milestones: ${crossed.join(', ')} total`,
    html: `<!DOCTYPE html>
<html><body style="font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;">
  <h2 style="margin:0 0 12px;">Application count milestones</h2>
  <p style="margin:0 0 12px;"><strong>${countAfter}</strong> lifetime rows in <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">applications_v2</code>.</p>
  <p style="margin:0 0 6px;">This submission crossed:</p>
  <ul>${milestonesList}</ul>
  <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Per-application staff emails have been replaced by milestones + end-of-period summaries.</p>
</body></html>`,
  });

  if (error) {
    const msg = formatResendError(error);
    console.error('Milestone admin email failed:', msg);
    return { sent: false, crossed, error: msg };
  }

  console.log('[admin email] Milestone:', crossed.join(', '), '→', recipients.join(', '));
  return { sent: true, crossed };
}

function buildSummaryHtml(rows: AppRowBrief[], periodEndIso: string): string {
  const total = rows.length;
  type Agg = {
    slug: string;
    lines: string[];
    statuses: { pending: number; approved: number; rejected: number };
  };

  const byClub = new Map<string, Agg>();
  const byYear = new Map<number, number>();
  const statusTotals = { pending: 0, approved: 0, rejected: 0 };

  for (const r of rows) {
    const cid = String(r.club_id ?? '').trim() || '(unknown)';
    if (!byClub.has(cid)) {
      byClub.set(cid, {
        slug: cid,
        lines: [],
        statuses: { pending: 0, approved: 0, rejected: 0 },
      });
    }
    const agg = byClub.get(cid)!;
    agg.lines.push(formatApplicantLine(r));

    const st = String(r.status ?? 'pending').toLowerCase() as keyof typeof agg.statuses;
    if (st === 'pending' || st === 'approved' || st === 'rejected') agg.statuses[st] += 1;
    else agg.statuses.pending += 1;

    const ost = String(r.status ?? 'pending').toLowerCase();
    if (ost === 'pending' || ost === 'approved' || ost === 'rejected') statusTotals[ost as keyof typeof statusTotals] += 1;
    else statusTotals.pending += 1;

    const y = r.year ?? null;
    if (y != null && Number.isFinite(Number(y))) byYear.set(Number(y), (byYear.get(Number(y)) ?? 0) + 1);
  }

  const clubRows = [...byClub.entries()]
    .sort((a, b) =>
      clubDisplayName(a[0]).localeCompare(clubDisplayName(b[0]), undefined, { sensitivity: 'base' })
    )
    .map(([, agg]) => {
      const nm = [...new Set(agg.lines)].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' }));
      const nameBlock =
        nm.length === 0
          ? '<p style="margin:4px 0;color:#64748b;">No applicant names on file.</p>'
          : `<ol style="margin:6px 0 0 18px;padding:0;line-height:1.45;font-size:13px;">${nm.map(
              (html) => `<li>${html}</li>`
            )}</ol>`;
      return `<tr valign="top">
        <td style="padding:10px;border:1px solid #e2e8f0;">
          <strong>${escapeHtml(clubDisplayName(agg.slug))}</strong>
          <div style="margin-top:4px;color:#475569;font-size:12px;">${agg.lines.length} application(s)</div>
          ${nameBlock}
        </td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-size:12px;color:#334155;width:130px;">
          Pending: ${agg.statuses.pending}<br/>
          Approved: ${agg.statuses.approved}<br/>
          Rejected: ${agg.statuses.rejected}
        </td>
      </tr>`;
    })
    .join('');

  const yearRows = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([year, cnt]) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Y${escapeHtml(String(year))}</strong></td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${cnt}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><body style="margin:16px;font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#0f172a;">
  <h2 style="margin:0 0 8px;">ANSxtra — Application period summary</h2>
  <p style="margin:0 0 16px;color:#475569;font-size:14px;">Period closed (configured): <strong>${escapeHtml(periodEndIso)}</strong></p>
  <p style="margin:8px 0;"><strong>Total applications recorded:</strong> ${total}</p>
  <p style="margin:8px 0;"><strong>By status:</strong> Pending ${statusTotals.pending}
    · Approved ${statusTotals.approved} · Rejected ${statusTotals.rejected}</p>
  <h3 style="margin:22px 0 8px;">By year group (from submission)</h3>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">${yearRows}</table>
  <h3 style="margin:22px 0 8px;">Per club — names</h3>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:920px;">
    ${clubRows}</table>
  <p style="margin-top:22px;color:#64748b;font-size:13px;">
    One automated email per APPLICATION_PERIOD_END_ISO value once the end time passes and cron runs successfully.
    Create table <code>application_admin_digest_log</code> in Supabase so duplicate summaries are suppressed.
  </p>
</body></html>`;
}

/**
 * After APPLICATION_PERIOD_END_ISO, sends one summary to ADMIN_EMAILS and records digest_key.
 */
export async function maybeSendApplicationPeriodSummary(admin: SupabaseClient): Promise<{
  status: string;
  skipped?: string;
  recipients?: number;
  error?: string;
}> {
  const end = getApplicationPeriodEndDate();
  const digestKey = getApplicationPeriodDigestKey();

  if (!end || !digestKey) {
    return { status: 'skipped', skipped: 'APPLICATION_PERIOD_END_ISO not set' };
  }

  if (Date.now() <= end.getTime()) {
    return {
      status: 'skipped',
      skipped: `Period not ended (ends ${end.toISOString()})`,
      recipients: getAdminEmails().length,
    };
  }

  const recipients = getAdminEmails();
  if (!recipients.length) {
    return { status: 'skipped', skipped: 'ADMIN_EMAILS empty', recipients: 0 };
  }

  const resend = getResendClient();
  if (!resend) return { status: 'skipped', skipped: 'RESEND_API_KEY not set', recipients: recipients.length };

  if (await digestAlreadyRecorded(admin, digestKey)) {
    return { status: 'skipped', skipped: 'already_sent_this_period', recipients: recipients.length };
  }

  const rawIso = process.env.APPLICATION_PERIOD_END_ISO!.trim();
  const { data: rows, error: selErr } = await admin
    .from('applications_v2')
    .select('club_id, first_name, last_name, prename, year, email, status');

  if (selErr) return { status: 'error', error: selErr.message };

  const list = (rows ?? []) as AppRowBrief[];
  const html = buildSummaryHtml(list, rawIso);

  const { error: sendErr } = await resend.emails.send({
    from: getResendFrom(),
    to: recipients,
    subject: `[ANSxtra] Applications closed — ${list.length} total (by club & year)`,
    html,
  });

  if (sendErr) {
    return {
      status: 'error',
      error: formatResendError(sendErr),
      recipients: recipients.length,
    };
  }

  await recordDigest(admin, digestKey);
  console.log('[admin email] Period summary sent →', recipients.join(', '));
  return { status: 'sent', recipients: recipients.length };
}
