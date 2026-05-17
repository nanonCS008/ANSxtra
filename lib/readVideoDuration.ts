/** Read video duration in seconds from a local File (browser only). */
export function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      video.load()
    }

    const timer = window.setTimeout(() => {
      cleanup()
      reject(
        new Error(
          'Could not read video length in time. Try a shorter MP4 clip, or re-export the video from your Photos app.'
        )
      )
    }, 20000)

    const finish = (duration: number) => {
      window.clearTimeout(timer)
      cleanup()
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video length. Try another file or re-export as MP4.'))
        return
      }
      resolve(duration)
    }

    video.onloadedmetadata = () => finish(video.duration)
    video.ondurationchange = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(video.duration)
      }
    }
    video.onerror = () => {
      window.clearTimeout(timer)
      cleanup()
      reject(new Error('Could not read this video file. Try choosing an MP4 from your gallery.'))
    }

    video.src = url
  })
}
