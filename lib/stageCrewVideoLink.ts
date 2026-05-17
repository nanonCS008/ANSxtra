export type StageCrewVideoLinkProvider = 'youtube' | 'google-drive'

export type ParsedStageCrewVideoLink =
  | { ok: true; url: string; provider: StageCrewVideoLinkProvider }
  | { ok: false; error: string }

/**
 * Validates and normalizes a public YouTube or Google Drive video link.
 */
export function parseStageCrewVideoLink(input: string): ParsedStageCrewVideoLink {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, error: 'Please paste a YouTube or Google Drive link.' }
  }

  let urlStr = raw
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`
  }

  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return { ok: false, error: 'Please enter a valid URL.' }
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0]
    if (!id) return { ok: false, error: 'Invalid YouTube link.' }
    return { ok: true, provider: 'youtube', url: `https://www.youtube.com/watch?v=${id}` }
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch' || parsed.pathname.startsWith('/watch')) {
      const v = parsed.searchParams.get('v')
      if (!v) return { ok: false, error: 'Invalid YouTube link — missing video ID.' }
      return { ok: true, provider: 'youtube', url: `https://www.youtube.com/watch?v=${v}` }
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?#]+)/)
    if (shortsMatch?.[1]) {
      return {
        ok: true,
        provider: 'youtube',
        url: `https://www.youtube.com/watch?v=${shortsMatch[1]}`,
      }
    }
    const embedMatch = parsed.pathname.match(/^\/embed\/([^/?#]+)/)
    if (embedMatch?.[1]) {
      return {
        ok: true,
        provider: 'youtube',
        url: `https://www.youtube.com/watch?v=${embedMatch[1]}`,
      }
    }
    return {
      ok: false,
      error: 'Use a YouTube link (youtube.com/watch?v=…, youtu.be/…, or /shorts/…).',
    }
  }

  if (host === 'drive.google.com') {
    if (parsed.pathname.includes('/folders/')) {
      return {
        ok: false,
        error: 'Folder links are not supported. Link directly to your video file.',
      }
    }
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/)
    const id = fileMatch?.[1] ?? parsed.searchParams.get('id')
    if (!id) {
      return {
        ok: false,
        error: 'Use a Google Drive file link (drive.google.com/file/d/…/view).',
      }
    }
    return {
      ok: true,
      provider: 'google-drive',
      url: `https://drive.google.com/file/d/${id}/view?usp=sharing`,
    }
  }

  return {
    ok: false,
    error: 'Only YouTube and Google Drive links are accepted. The link must be set to public (anyone with the link can view).',
  }
}

export function isValidStageCrewVideoLink(input: string): boolean {
  return parseStageCrewVideoLink(input).ok
}

export function extractGoogleDriveFileId(url: string): string | null {
  const parsed = parseStageCrewVideoLink(url)
  if (!parsed.ok || parsed.provider !== 'google-drive') return null
  const match = parsed.url.match(/\/file\/d\/([^/]+)/)
  return match?.[1] ?? null
}
