import { useRef, useState } from 'react'
import { db, newId, now } from '../db'
import MediaImage from './MediaImage'

interface Props {
  photoIds: string[]
  onChange: (next: string[]) => void
}

export default function PhotoUploader({ photoIds, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFiles(files: FileList | File[]) {
    const newIds: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const id = newId()
      await db.media.add({
        id,
        filename: file.name,
        mimeType: file.type,
        blob: file,
        createdAt: now(),
      })
      newIds.push(id)
    }
    if (newIds.length > 0) onChange([...photoIds, ...newIds])
  }

  async function removePhoto(id: string) {
    onChange(photoIds.filter(p => p !== id))
    await db.media.delete(id)
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragging ? 'border-slate-900 bg-slate-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className="text-sm text-slate-600">
          Klik eller træk billeder hertil
        </p>
      </div>
      {photoIds.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photoIds.map(id => (
            <li key={id} className="relative group">
              <MediaImage mediaId={id} className="w-full h-28 object-cover rounded border border-slate-200" />
              <button
                type="button"
                onClick={() => removePhoto(id)}
                className="absolute top-1 right-1 px-1.5 py-0.5 text-xs bg-white/90 hover:bg-white text-red-600 border border-slate-200 rounded opacity-0 group-hover:opacity-100 transition"
                aria-label="Fjern billede"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
