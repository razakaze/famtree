import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { personDisplayName, type Person } from '../types'
import { lifespan } from '../util'
import MediaImage from '../components/MediaImage'

export default function PersonList() {
  const [query, setQuery] = useState('')
  const persons = useLiveQuery(() => db.persons.toArray(), [], [] as Person[])

  const filtered = useMemo(() => {
    const sorted = [...persons].sort((a, b) => {
      const s = (a.surname || '').localeCompare(b.surname || '', 'da')
      if (s !== 0) return s
      return (a.givenNames || '').localeCompare(b.givenNames || '', 'da')
    })
    if (!query.trim()) return sorted
    const q = query.toLowerCase().trim()
    return sorted.filter(p => personDisplayName(p).toLowerCase().includes(q))
  }, [persons, query])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 flex-1">Personer</h1>
        <Link
          to="/person/new"
          className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-700"
        >
          + Tilføj person
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Søg…"
        className="w-full px-3 py-2 border border-slate-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      {filtered.length === 0 ? (
        <EmptyState hasAny={persons.length > 0} />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <li key={p.id}>
              <Link
                to={`/person/${p.id}`}
                className="block bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-400 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  {p.photoIds[0] ? (
                    <MediaImage
                      mediaId={p.photoIds[0]}
                      className="w-12 h-12 object-cover rounded-full border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium flex-shrink-0">
                      {(p.givenNames[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{personDisplayName(p)}</div>
                    <div className="text-xs text-slate-500">{lifespan(p.birth?.date, p.death?.date) || '—'}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  if (hasAny) return <p className="text-slate-500 text-center py-12">Ingen matches.</p>
  return (
    <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-lg">
      <p className="text-slate-600 mb-4">Træet er tomt. Begynd med at tilføje en person, eller importér en GEDCOM-fil.</p>
      <div className="flex justify-center gap-2">
        <Link to="/person/new" className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-700">
          Tilføj person
        </Link>
        <Link to="/data" className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-100">
          Importér GEDCOM
        </Link>
      </div>
    </div>
  )
}
