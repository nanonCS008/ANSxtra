import clubs from '@/data/clubs.json';
import { getApplicationResponseDisplayRows } from '@/lib/clubFormFields';
import { buildSchoolShowStageCrewDisclaimerHtml } from '@/lib/email/schoolShowEmailDisclaimer';
import { buildStudentApplicationReceivedEmailHtml } from '@/lib/email/studentApplicationReceivedHtml';
import { formatResendError, getPublicSiteUrl, getResendClient, getResendFrom } from '@/lib/resendConfig';

/**
 * Sends a single confirmation email after one or more applications are created in this request.
 */
export async function sendStudentApplicationReceivedEmail(params: {
  to: string;
  studentFirstName: string | null;
  applicationRows: Array<{ club_id?: string | null }>;
  responses: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  const trimmedTo = params.to.trim();
  if (!trimmedTo) {
    return { ok: false, error: 'missing student email' };
  }

  const sections = params.applicationRows.map((row) => {
    const cid = String(row.club_id ?? '').trim();
    const club = clubs.find((c) => c.id === cid);
    return {
      clubName: club?.name ?? cid.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      rows: getApplicationResponseDisplayRows(params.responses, cid),
      disclaimerHtml: cid === 'school-show' ? buildSchoolShowStageCrewDisclaimerHtml() : undefined,
    };
  });

  const base = getPublicSiteUrl();
  const myApplicationsUrl = base ? `${base}/my-applications` : null;

  const html = buildStudentApplicationReceivedEmailHtml({
    studentFirstName: params.studentFirstName,
    sections,
    myApplicationsUrl,
  });

  const subject =
    sections.length === 1 ?
      `[ANSxtra] Application received — ${sections[0].clubName}`
    : `[ANSxtra] Applications received (${sections.length} clubs)`;

  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: trimmedTo,
    subject,
    html,
  });

  if (error) {
    return { ok: false, error: formatResendError(error) };
  }

  return { ok: true };
}
