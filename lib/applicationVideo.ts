/** Supabase Storage bucket for club application videos (create via supabase-storage-setup.sql). */
export const APPLICATION_VIDEOS_BUCKET = 'application-videos'

export const APPLICATION_VIDEO_MIN_SECONDS = 60
export const APPLICATION_VIDEO_MAX_SECONDS = 150

/** 200 MB — enough for ~2 min phone video */
export const APPLICATION_VIDEO_MAX_BYTES = 200 * 1024 * 1024

export const APPLICATION_VIDEO_ACCEPT =
  'video/*,video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.webm,.m4v'

export const APPLICATION_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-m4v',
  'video/mpeg',
])

/** iOS and some Android pickers leave `file.type` empty — infer from extension. */
export function resolveVideoContentType(contentType = '', fileName = ''): string {
  const raw = contentType.toLowerCase().split(';')[0].trim()
  if (raw.startsWith('video/')) return raw

  const ext = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  const byExt: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    webm: 'video/webm',
    '3gp': 'video/3gpp',
  }
  if (ext && byExt[ext]) return byExt[ext]
  return 'video/mp4'
}

export function inferVideoContentType(file: File): string {
  return resolveVideoContentType(file.type, file.name)
}

export function isVideoFile(file: File): boolean {
  const mime = inferVideoContentType(file)
  return mime.startsWith('video/') && APPLICATION_VIDEO_MIME_TYPES.has(mime)
}

export function extensionForVideoMime(mime: string, fileName?: string): string {
  const m = mime.toLowerCase().split(';')[0].trim()
  if (m === 'video/quicktime') return 'mov'
  if (m === 'video/webm') return 'webm'
  if (m === 'video/3gpp') return '3gp'
  if (m === 'video/mp4' || m === 'video/x-m4v') return 'mp4'
  const fromName = fileName?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  if (fromName && ['mp4', 'mov', 'webm', 'm4v', '3gp'].includes(fromName)) return fromName
  return 'mp4'
}

export function buildApplicationVideoStoragePath(
  clubId: string,
  userId: string,
  ext: string
): string {
  const safeClub = clubId.replace(/[^a-z0-9-]/gi, '')
  const safeUser = userId.replace(/[^a-z0-9-]/gi, '')
  return `${safeClub}/${safeUser}/${crypto.randomUUID()}.${ext}`
}

export function getPublicVideoUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${base}/storage/v1/object/public/${APPLICATION_VIDEOS_BUCKET}/${cleanPath}`
}

export function isAllowedApplicationVideoUrl(url: string, supabaseUrl: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const expectedPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${APPLICATION_VIDEOS_BUCKET}/`
    return trimmed.startsWith(expectedPrefix)
  } catch {
    return false
  }
}

export function formatVideoDuration(seconds: number): string {
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
