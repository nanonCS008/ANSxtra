import { createHmac } from 'crypto'

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/** Short-lived Supabase JWT so the browser can call Storage as the signed-in student. */
export function signSupabaseAccessToken(userId: string, email: string | null): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured')
  }
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64UrlEncode(
    JSON.stringify({
      aud: 'authenticated',
      exp: now + 60 * 60,
      iat: now,
      iss: `${supabaseUrl}/auth/v1`,
      sub: userId,
      email: email ?? undefined,
      role: 'authenticated',
    })
  )

  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${header}.${payload}.${signature}`
}
