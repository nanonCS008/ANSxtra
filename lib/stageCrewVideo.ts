/** Supabase Storage bucket for School Show Stage Crew application videos. */
export const STAGE_CREW_VIDEOS_BUCKET = 'stage-crew-videos'

export const STAGE_CREW_VIDEO_MIN_SECONDS = 60
export const STAGE_CREW_VIDEO_MAX_SECONDS = 150

/** 100 MB */
export const STAGE_CREW_VIDEO_MAX_BYTES = 100 * 1024 * 1024

export const STAGE_CREW_VIDEO_ACCEPT =
  'video/*,video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.webm,.m4v'

export const STAGE_CREW_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/x-m4v',
  'video/mpeg',
])

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
  return mime.startsWith('video/') && STAGE_CREW_VIDEO_MIME_TYPES.has(mime)
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

export function buildStageCrewVideoPath(userId: string, ext: string): string {
  const safeUser = userId.replace(/[^a-z0-9-]/gi, '')
  return `school-show/${safeUser}/${crypto.randomUUID()}.${ext}`
}

export function getStageCrewVideoPublicUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const cleanPath = storagePath.replace(/^\/+/, '')
  return `${base}/storage/v1/object/public/${STAGE_CREW_VIDEOS_BUCKET}/${cleanPath}`
}

export function isAllowedStageCrewVideoUrl(url: string, supabaseUrl: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  const expectedPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${STAGE_CREW_VIDEOS_BUCKET}/`
  return trimmed.startsWith(expectedPrefix)
}

export function formatVideoDuration(seconds: number): string {
  const s = Math.round(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
