/** Pause between sequential Resend calls (ms). Default ~4/sec to stay under 5 req/s limit. */
export function getResendEmailDelayMs(): number {
  const raw = parseInt(process.env.RESEND_EMAIL_DELAY_MS ?? '250', 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 250;
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function isResendRateLimitError(detail: string): boolean {
  return /429|rate\s*limit|too many requests/i.test(detail);
}
