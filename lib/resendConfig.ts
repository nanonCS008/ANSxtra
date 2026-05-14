import { Resend } from 'resend';

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
  return new Resend(key);
}

/**
 * Must use a domain you verified in Resend, or Resend's test domain for development.
 * @see https://resend.com/docs/dashboard/domains/introduction
 */
export function getResendFrom(): string {
  const f = process.env.RESEND_FROM?.trim();
  if (f) return f;
  return 'ANSxtra <noreply@ansxtra.com>';
}

/** Escape a URL for use inside double-quoted HTML attributes. */
function escapeAttrUrl(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '%3C');
}

/**
 * Absolute HTTPS URL for the brand mark shown inside HTML emails (approval, etc.).
 * Set `EMAIL_BRAND_LOGO_URL` to any square-ish PNG/SVG URL you host publicly.
 * Otherwise uses `NEXT_PUBLIC_SITE_URL` + `/ansxtra-logo.png` when the site URL is https.
 */
export function getEmailBrandLogoUrl(): string | null {
  const custom = process.env.EMAIL_BRAND_LOGO_URL?.trim();
  if (custom && /^https:\/\//i.test(custom)) return custom;

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (base && /^https:\/\//i.test(base)) return `${base}/ansxtra-logo.png`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, '')}/ansxtra-logo.png`;

  return null;
}

/** Optional centered `<img>` for transactional emails; empty string if no public URL configured. */
export function getEmailBrandLogoImgHtml(): string {
  const url = getEmailBrandLogoUrl();
  if (!url) return '';
  const src = escapeAttrUrl(url);
  return `<div style="text-align:center;margin:0 0 16px;">
    <img src="${src}" alt="ANSXtra" width="88" height="88" style="width:88px;max-width:88px;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
  </div>`;
}
