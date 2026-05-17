import { createClient } from '@supabase/supabase-js'

import { APPLICATION_VIDEOS_BUCKET } from '@/lib/applicationVideo'

function getSupabaseBrowserKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    ''
  )
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseBrowserKey())
}

/** Upload using the official Supabase signed-upload API (works for large files; bypasses our server). */
export async function uploadVideoViaSignedUrl(
  storagePath: string,
  token: string,
  file: File,
  contentType: string
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseBrowserKey()
  if (!url || !key) {
    throw new Error('Video storage is not configured on this site.')
  }

  const supabase = createClient(url, key)
  const { error } = await supabase.storage
    .from(APPLICATION_VIDEOS_BUCKET)
    .uploadToSignedUrl(storagePath, token, file, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(error.message || 'Upload to storage failed.')
  }
}
