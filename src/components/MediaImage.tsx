import { useEffect, useState } from 'react'
import { db } from '../db'

interface Props {
  mediaId: string
  className?: string
  alt?: string
}

export default function MediaImage({ mediaId, className, alt }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    db.media.get(mediaId).then(media => {
      if (revoked || !media) return
      objectUrl = URL.createObjectURL(media.blob)
      setUrl(objectUrl)
    })
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])

  if (!url) return <div className={`bg-slate-200 ${className ?? ''}`} aria-hidden />
  return <img src={url} className={className} alt={alt ?? ''} />
}
