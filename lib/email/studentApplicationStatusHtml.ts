import { getClubApprovalFirstMeetingDetails } from '@/lib/email/clubApprovalMeetingDetails';
import { escapeAttrUrl, getAnsxtraFeedbackFormUrl, getStudentEmailSupportFooterHtml } from '@/lib/resendConfig';

const FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const BRAND_PINK = '#D946EF';
const SIDEBAR = '#0f172a';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type StudentApplicationStatusEmailParams = {
  clubName: string;
  status: 'approved' | 'rejected';
  studentFullName: string | null;
  notes: string | null;
  acceptanceMessage: string | null;
  /** Club slug from `applications_v2.club_id` — used for first-meeting details on approval */
  clubId?: string | null;
};

function firstMeetingDetailsBlock(p: StudentApplicationStatusEmailParams): string {
  if (p.status !== 'approved') return '';

  const details = getClubApprovalFirstMeetingDetails(p.clubId, p.clubName);

  return `
    <div style="margin-top:20px;padding:16px 18px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
      <div style="font-size:11px;font-weight:700;color:${BRAND_PINK};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">First meeting details</div>
      <div style="white-space:pre-wrap;color:#0f172a;line-height:1.6;font-size:14px;font-weight:500;">${escapeHtml(details)}</div>
      <p style="margin:12px 0 0;font-size:12px;color:#64748b;line-height:1.5;">Please confirm details with your club leaders if anything changes.</p>
    </div>`;
}

function approvalFeedbackBlock(): string {
  const url = getAnsxtraFeedbackFormUrl();
  const href = escapeAttrUrl(url);
  return `
    <div style="margin-top:24px;padding:16px 18px;border-radius:12px;background:#ecfdf5;border:1px solid #a7f3d0;">
      <div style="font-size:11px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;">
        Help us improve ANSxtra
      </div>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#14532d;">
        If you have a moment, please complete our short feedback form. Your responses help the team improve the club application experience and guide future development.
      </p>
      <a href="${href}"
        style="display:inline-block;padding:10px 18px;border-radius:10px;background:#047857;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
        Open feedback form
      </a>
    </div>`;
}

/**
 * HTML for the student-facing application approved / rejected email (Resend).
 */
export function buildStudentApplicationStatusEmailHtml(p: StudentApplicationStatusEmailParams): string {
  const statusLabel = p.status === 'approved' ? 'Approved' : 'Rejected';
  const accent = p.status === 'approved' ? BRAND_PINK : '#64748b';

  const welcome = p.studentFullName
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${SIDEBAR};">Hi <strong>${escapeHtml(p.studentFullName)}</strong>,</p>`
    : '';

  const statusLine =
    p.status === 'approved'
      ? `<p style="margin:0;font-size:15px;line-height:1.65;color:${SIDEBAR};">Congratulations — your application was <strong style="color:#059669;">approved</strong>. Welcome to <strong>${escapeHtml(p.clubName)}</strong>!</p>`
      : `<p style="margin:0;font-size:15px;line-height:1.65;color:${SIDEBAR};">Your application was <strong>not approved</strong> at this time. Thank you for your interest in <strong>${escapeHtml(p.clubName)}</strong>.</p>`;

  const notesBlock = p.notes
    ? `<div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;">
        <div style="font-weight:700;color:#92400e;font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;">Note from reviewer</div>
        <div style="color:#78350f;white-space:pre-wrap;line-height:1.55;font-size:14px;">${escapeHtml(p.notes)}</div>
      </div>`
    : '';

  const leaderMsg =
    p.status === 'approved' && p.acceptanceMessage?.trim()
      ? `<div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:#faf5ff;border:1px solid #e9d5ff;">
          <div style="font-weight:700;color:#6b21a8;margin-bottom:8px;font-size:13px;">Message from your club leaders</div>
          <div style="white-space:pre-wrap;color:#3b0764;line-height:1.6;font-size:14px;">${escapeHtml(p.acceptanceMessage.trim())}</div>
        </div>`
      : '';

  const schedule = firstMeetingDetailsBlock(p);
  const feedback = p.status === 'approved' ? approvalFeedbackBlock() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(p.clubName)} — Application ${statusLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
          <tr>
            <td style="height:4px;background:${accent};line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:0 8px 8px;">
              <div style="padding:20px 22px 28px;font-family:${FONT};">
                <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:${SIDEBAR};letter-spacing:-0.02em;line-height:1.3;">
                  ${escapeHtml(p.clubName)}
                </h1>
                <p style="margin:0 0 20px;font-size:13px;color:#64748b;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">
                  Application ${statusLabel}
                </p>
                ${welcome}
                ${statusLine}
                ${leaderMsg}
                ${schedule}
                ${notesBlock}
                ${feedback}
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;font-family:${FONT};max-width:520px;">
          This message was sent by ANSxtra on behalf of your school club team.
        </p>
        ${getStudentEmailSupportFooterHtml()}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
