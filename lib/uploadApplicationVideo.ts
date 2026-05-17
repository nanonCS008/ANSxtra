/** Client-side helpers for School Show video upload (no Supabase browser key required). */

export async function prepareVideoUpload(
  clubId: string,
  file: File,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; token: string; storagePath: string }> {
  const res = await fetch('/api/applications/video-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clubId,
      fileName: file.name,
      fileSize: file.size,
      contentType,
    }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload?.error ?? 'Could not start upload.')
  }

  const uploadUrl = typeof payload?.uploadUrl === 'string' ? payload.uploadUrl : ''
  const publicUrl = typeof payload?.publicUrl === 'string' ? payload.publicUrl.trim() : ''
  const token = typeof payload?.token === 'string' ? payload.token : ''
  const storagePath = typeof payload?.storagePath === 'string' ? payload.storagePath : ''

  if (!uploadUrl || !publicUrl || !token) {
    throw new Error('Upload setup failed. Please try again.')
  }

  return { uploadUrl, publicUrl, token, storagePath }
}

export async function uploadFileToSignedUrl(uploadUrl: string, token: string, file: File): Promise<void> {
  const target = new URL(uploadUrl)
  if (!target.searchParams.has('token')) {
    target.searchParams.set('token', token)
  }

  const formData = new FormData()
  formData.append('cacheControl', '3600')
  formData.append('', file, file.name || 'video.mp4')

  const res = await fetch(target.toString(), {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: formData,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Signed storage upload failed:', res.status, detail)
    throw new Error('Upload failed. Check your connection and try again.')
  }
}

export async function uploadVideoViaServer(file: File, clubId: string, contentType: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, file.name || 'video.mp4')
  formData.append('clubId', clubId)
  formData.append('contentType', contentType)

  const res = await fetch('/api/applications/video-upload', {
    method: 'POST',
    body: formData,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(payload?.error ?? 'Upload failed.') as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const publicUrl = typeof payload?.publicUrl === 'string' ? payload.publicUrl.trim() : ''
  if (!publicUrl) throw new Error('Upload completed but no video URL was returned.')
  return publicUrl
}

/** Try server upload first; fall back to signed URL (works for large files on Vercel). */
export async function uploadApplicationVideo(
  file: File,
  clubId: string,
  contentType: string
): Promise<string> {
  try {
    return await uploadVideoViaServer(file, clubId, contentType)
  } catch (serverErr) {
    const status = (serverErr as Error & { status?: number }).status
    const shouldRetrySigned = status === 413 || status === 502 || status === 504 || status === 500
    if (!shouldRetrySigned) throw serverErr

    const { uploadUrl, publicUrl, token } = await prepareVideoUpload(clubId, file, contentType)
    await uploadFileToSignedUrl(uploadUrl, token, file)
    return publicUrl
  }
}
