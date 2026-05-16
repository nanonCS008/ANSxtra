import { getEmailBrandHeaderBlockHtml, escapeAttrUrl, getStudentEmailSupportFooterHtml } from '@/lib/resendConfig';

import type { ApplicationResponseDisplayRow } from '@/lib/clubFormFields';

const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SIDEBAR = '#0f172a';
/** Yellow palette — no brown tones */
const PENDING_BG = '#fef9c3';
const PENDING_BORDER = '#facc15';
const PENDING_LABEL = '#1e293b';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ReceivedSection = {
  clubName: string;
  rows: ApplicationResponseDisplayRow[];
};

export type StudentApplicationReceivedEmailParams = {
  studentFirstName: string | null;
  sections: ReceivedSection[];
  /** https origin + /my-applications when configured */
  myApplicationsUrl: string | null;
};

function qaBlock(rows: ApplicationResponseDisplayRow[]): string {
  if (rows.length === 0) {
    return `<p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
      No written responses were required for this application — your interest has still been recorded.
    </p>`;
  }

  const items = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 14px;border:1px solid #e2e8f0;vertical-align:top;background:#f8fafc;width:38%;">
        <div style="font-size:12px;font-weight:700;color:#475569;line-height:1.45;">${escapeHtml(r.label)}</div>
      </td>
      <td style="padding:12px 14px;border:1px solid #e2e8f0;vertical-align:top;background:#ffffff;">
        <div style="font-size:14px;color:${SIDEBAR};line-height:1.55;white-space:pre-wrap;">${escapeHtml(r.value)}</div>
      </td>
    </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${items}</table>`;
}

/**
 * HTML for the student-facing “application received” confirmation (Resend).
 */
export function buildStudentApplicationReceivedEmailHtml(p: StudentApplicationReceivedEmailParams): string {
  const welcome = p.studentFirstName?.trim()
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${SIDEBAR};">Hi <strong>${escapeHtml(p.studentFirstName.trim())}</strong>,</p>`
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${SIDEBAR};">Hi,</p>`;

  const statusPill = `
    <div style="display:inline-block;margin:0 0 18px;padding:8px 14px;border-radius:999px;background:${PENDING_BG};border:1px solid ${PENDING_BORDER};">
      <span style="font-size:12px;font-weight:800;color:${PENDING_LABEL};letter-spacing:0.06em;text-transform:uppercase;">Pending review</span>
    </div>`;

  const intro =
    p.sections.length === 1
      ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${SIDEBAR};">
          We’ve received your application. Club leaders will review it in due course.
        </p>`
      : `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${SIDEBAR};">
          We’ve received <strong>${p.sections.length}</strong> club applications from you. Each is listed below. Club leaders will review them in due course.
        </p>`;

  const sectionsHtml = p.sections
    .map((sec, i) => {
      const top = i === 0 ? '' : 'margin-top:28px;';
      return `
        <div style="${top}">
          <h2 style="margin:0 0 10px;font-size:16px;font-weight:800;color:${SIDEBAR};letter-spacing:-0.01em;">
            ${escapeHtml(sec.clubName)}
          </h2>
          ${qaBlock(sec.rows)}
        </div>`;
    })
    .join('');

  const nextSteps = `
    <div style="margin-top:24px;padding:16px 18px;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
        You’ll receive <strong>another email</strong> when your application is <strong>approved</strong> or <strong>not approved</strong>. Please wait for that message — there’s nothing else you need to do right now.
      </p>
    </div>`;

  const myApps =
    p.myApplicationsUrl ?
      `<p style="margin:16px 0 0;font-size:14px;line-height:1.55;color:#64748b;">
        View your submissions anytime:
        <a href="${escapeAttrUrl(p.myApplicationsUrl)}" style="color:#7c3aed;font-weight:600;">My applications</a>
      </p>`
    : '';

  const brand = getEmailBrandHeaderBlockHtml();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Application received</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
          <tr>
            <td style="height:4px;background:#eab308;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:12px 22px 28px;font-family:${FONT};">
              ${brand}
                <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
                  Application received
                </p>
                ${welcome}
                ${statusPill}
                ${intro}
                ${sectionsHtml}
                ${nextSteps}
                ${myApps}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;font-family:${FONT};max-width:520px;">
          This message was sent by ANSxtra to confirm your club application was submitted.
        </p>
        ${getStudentEmailSupportFooterHtml()}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
