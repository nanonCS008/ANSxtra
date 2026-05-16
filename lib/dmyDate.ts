/** ISO date `YYYY-MM-DD` for DofE DOB (Gregorian / CE). */

export function parseStoredDobIso(iso: string): { d: number; m: number; y: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null
  const [yStr, mStr, dStr] = iso.trim().split('-')
  const y = parseInt(yStr, 10)
  const m = parseInt(mStr, 10)
  const d = parseInt(dStr, 10)
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
    return null
  }
  return { d, m, y }
}

export function isValidStoredDobIso(iso: string): boolean {
  return parseStoredDobIso(iso) != null
}

export function formatDobIsoForDisplay(iso: string): string {
  const p = parseStoredDobIso(iso)
  if (!p) return iso
  const dt = new Date(p.y, p.m - 1, p.d)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
