import { Resend } from 'resend';

let warnedResendKeyFormat = false;
let warnedAnsxtraFromDomain = false;

/** Resend returns `{ data, error }`; failures are not thrown. */
export function formatResendError(error: { message?: string; name?: string } | null | undefined): string {
  if (!error) return 'Unknown Resend error';
  const name = error.name ? String(error.name) : 'resend_error';
  const msg = error.message ? String(error.message) : '';
  return msg ? `${name}: ${msg}` : name;
}

export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith('re_') && !warnedResendKeyFormat) {
    warnedResendKeyFormat = true;
    console.warn(
      '[Resend] RESEND_API_KEY should start with "re_" (create at resend.com/api-keys). Wrong or placeholder keys return "API key is invalid".'
    );
  }
  return new Resend(key);
}

/**
 * Must use an address on a domain you verified in Resend, or Resend's built-in test sender.
 * Default uses onboarding@resend.dev so local/staging works without DNS; set RESEND_FROM for production
 * (e.g. ANSxtra <noreply@yourdomain.com> after verifying that domain in Resend).
 * @see https://resend.com/docs/dashboard/domains/introduction
 */
export function getResendFrom(): string {
  const f = process.env.RESEND_FROM?.trim();
  if (f) {
    if (
      /@ansxtra\.com/i.test(f) &&
      !warnedAnsxtraFromDomain
    ) {
      warnedAnsxtraFromDomain = true;
      console.warn(
        '[Resend] RESEND_FROM uses @ansxtra.com. Resend only accepts that after the domain is verified in the Resend dashboard. Until then, delete RESEND_FROM in Vercel (defaults to onboarding@resend.dev) or set RESEND_FROM=ANSxtra <onboarding@resend.dev>.'
      );
    }
    return f;
  }
  return 'ANSxtra <onboarding@resend.dev>';
}

/** Escape a URL for use inside double-quoted HTML attributes. */
export function escapeAttrUrl(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '%3C');
}

const STUDENT_SUPPORT_EMAIL = '79528@student.amnuaysilpa.ac.th';

/**
 * Very small, low-contrast line for student-facing transactional emails.
 */
export function getStudentEmailSupportFooterHtml(): string {
  const href = escapeAttrUrl(`mailto:${STUDENT_SUPPORT_EMAIL}`);
  return `<p style="margin:8px 0 0;font-size:10px;line-height:1.5;color:#cbd5e1;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;">
    Issues or complaints? Contact Nanon Jirapongsuwan:
    <a href="${href}" style="color:#94a3b8;text-decoration:none;border-bottom:1px solid #cbd5e1;">${STUDENT_SUPPORT_EMAIL}</a>
  </p>`;
}

/**
 * Public HTTPS origin for links and assets in emails (`https://your-domain.com`, no trailing slash).
 */
export function getPublicSiteUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (base && /^https:\/\//i.test(base)) return base;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, '')}`;

  return null;
}

let warnedFeedbackFormUrl = false;

/** Default [ANSXtra Feedback](https://forms.gle/cSos2G3GkmCEuq7G8) Google Form — no env required. */
const DEFAULT_ANSXTRA_FEEDBACK_FORM_URL = 'https://forms.gle/cSos2G3GkmCEuq7G8';

/**
 * HTTPS URL for the ANSxtra feedback form in approval emails.
 * Uses `ANSXTRA_FEEDBACK_FORM_URL` when set to a valid https URL; otherwise the built-in Google Form.
 */
export function getAnsxtraFeedbackFormUrl(): string {
  const raw = process.env.ANSXTRA_FEEDBACK_FORM_URL?.trim();
  if (raw) {
    if (/^https:\/\//i.test(raw)) return raw;
    if (!warnedFeedbackFormUrl) {
      warnedFeedbackFormUrl = true;
      console.warn(
        '[email] ANSXTRA_FEEDBACK_FORM_URL must be an https URL; using default ANSxtra feedback form.'
      );
    }
  }
  return DEFAULT_ANSXTRA_FEEDBACK_FORM_URL;
}

/**
 * Absolute HTTPS URL for the brand mark shown inside HTML emails (approval, etc.).
 * Set `EMAIL_BRAND_LOGO_URL` to any square-ish PNG/SVG URL you host publicly.
 * Otherwise uses `NEXT_PUBLIC_SITE_URL` + `/ansxtra-logo.png` when the site URL is https.
 */
export function getEmailBrandLogoUrl(): string | null {
  const custom = process.env.EMAIL_BRAND_LOGO_URL?.trim();
  if (custom && /^https:\/\//i.test(custom)) return custom;

  const base = getPublicSiteUrl();
  if (base) return `${base}/ansxtra-logo.png`;

  return null;
}

const BRAND_PINK = '#D946EF';

function getEmailBrandWordmarkInnerHtml(): string {
  return `
    <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#0f172a;line-height:1.2;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      ANS<span style="color:${BRAND_PINK};">x</span>tra
    </div>
    <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;margin-top:4px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      Club applications
    </div>`;
}

/**
 * Text-only ANSxtra header for HTML emails (no logo image; compact vertical space).
 */
export function getEmailBrandHeaderBlockHtml(): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
      <tr>
        <td align="center" style="padding:0 0 8px;">${getEmailBrandWordmarkInnerHtml()}</td>
      </tr>
    </table>`;
}

/** @deprecated Prefer getEmailBrandHeaderBlockHtml for student-facing templates. */
export function getEmailBrandLogoImgHtml(): string {
  return getEmailBrandHeaderBlockHtml();
}
