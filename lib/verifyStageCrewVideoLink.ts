import {
  extractGoogleDriveFileId,
  type ParsedStageCrewVideoLink,
  type StageCrewVideoLinkProvider,
} from '@/lib/stageCrewVideoLink'

export type VideoLinkVerifyResult =
  | { ok: true; provider: StageCrewVideoLinkProvider }
  | { ok: false; error: string }

const FETCH_TIMEOUT_MS = 12_000

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
}

/**
 * Checks that a normalized YouTube or Google Drive link is viewable without signing in.
 */
export async function verifyStageCrewVideoLink(
  parsed: Extract<ParsedStageCrewVideoLink, { ok: true }>
): Promise<VideoLinkVerifyResult> {
  if (parsed.provider === 'youtube') {
    return verifyYouTubeLink(parsed.url)
  }
  return verifyGoogleDriveLink(parsed.url)
}

async function verifyYouTubeLink(url: string): Promise<VideoLinkVerifyResult> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`

  try {
    const res = await fetchWithTimeout(oembedUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'ANSxtra/1.0 (+video-link-check)' },
    })

    if (res.ok) {
      return { ok: true, provider: 'youtube' }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          'This YouTube video is private. Set visibility to Public or Unlisted, then paste the link again.',
      }
    }

    return {
      ok: false,
      error:
        'We could not open this YouTube link. Check the URL and make sure the video is Public or Unlisted.',
    }
  } catch (err) {
    console.error('[verifyStageCrewVideoLink] YouTube check failed', err)
    return {
      ok: false,
      error: 'Could not verify your YouTube link right now. Please try again in a moment.',
    }
  }
}

async function verifyGoogleDriveLink(url: string): Promise<VideoLinkVerifyResult> {
  const fileId = extractGoogleDriveFileId(url)
  if (!fileId) {
    return { ok: false, error: 'Invalid Google Drive link.' }
  }

  const apiKey = process.env.GOOGLE_API_KEY?.trim()
  if (apiKey) {
    const apiProbe = await probeGoogleDriveApi(fileId, apiKey)
    if (apiProbe === 'public') return { ok: true, provider: 'google-drive' }
    if (apiProbe === 'not_found') {
      return {
        ok: false,
        error: 'This Google Drive file was not found. Check the link and try again.',
      }
    }
  }

  return checkGoogleDriveViaHtmlProbe(fileId)
}

type DriveApiProbe = 'public' | 'not_found' | 'inconclusive'

async function probeGoogleDriveApi(fileId: string, apiKey: string): Promise<DriveApiProbe> {
  const endpoint = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`)
  endpoint.searchParams.set('fields', 'id,name,mimeType')
  endpoint.searchParams.set('supportsAllDrives', 'true')
  endpoint.searchParams.set('key', apiKey)

  try {
    const res = await fetchWithTimeout(endpoint.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (res.ok) return 'public'
    if (res.status === 404) return 'not_found'
    return 'inconclusive'
  } catch (err) {
    console.error('[verifyStageCrewVideoLink] Drive API check failed', err)
    return 'inconclusive'
  }
}

async function checkGoogleDriveViaHtmlProbe(fileId: string): Promise<VideoLinkVerifyResult> {
  const viewUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`

  try {
    const res = await fetchWithTimeout(viewUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    })

    const html = await res.text()
    const lower = html.toLowerCase()

    const needsSignIn =
      lower.includes('accounts.google.com/v3/signin') ||
      lower.includes('servicelogin') ||
      lower.includes('you need access') ||
      lower.includes('request access') ||
      lower.includes('sign in to your google account') ||
      lower.includes('sign in to continue') ||
      lower.includes('access_denied')

    if (needsSignIn) {
      return {
        ok: false,
        error:
          'This Google Drive file is not shared for viewing. Open Share → General access → Anyone with the link (Viewer), then paste the link again.',
      }
    }

    const looksViewable =
      lower.includes('drive-viewer') ||
      lower.includes('drive-viewer-video') ||
      lower.includes('vieweraction=view') ||
      lower.includes('enablevideoplayer') ||
      (lower.includes('"docs-ml') && lower.includes(fileId.toLowerCase()))

    if (res.ok && looksViewable) {
      return { ok: true, provider: 'google-drive' }
    }

    return {
      ok: false,
      error:
        'We could not verify this Google Drive link opens without signing in. Set sharing to Anyone with the link (Viewer) and test the link in an incognito/private window.',
    }
  } catch (err) {
    console.error('[verifyStageCrewVideoLink] Drive HTML probe failed', err)
    return {
      ok: false,
      error: 'Could not verify your Google Drive link right now. Please try again in a moment.',
    }
  }
}
