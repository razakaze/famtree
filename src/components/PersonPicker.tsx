import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { personDisplayName, type Person, type Sex } from '../types'
import { lifespan } from '../util'

interface Props {
  value?: string
  onChange: (id: string | undefined) => void
  sex?: Sex
  excludeIds?: string[]
  placeholder?: string
}

export default function PersonPicker({ value, onChange, sex, excludeIds, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const persons = useLiveQuery(() => db.persons.toArray(), [], [] as Person[])
  const selected = persons.find(p => p.id === value)

  const matches = useMemo(() => {
    const exclude = new Set(excludeIds ?? [])
    return persons
      .filter(p => !exclude.has(p.id))
      .filter(p => !sex || p.sex === sex)
      .filter(p => {
        if (!query) return true
        const q = query.toLowerCase()
        return personDisplayName(p).toLowerCase().includes(q)
      })
      .slice(0, 15)
  }, [persons, query, sex, excludeIds])

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded">
        <span className="text-sm">
          {personDisplayName(selected)}
          <span className="text-slate-500 ml-2">{lifespan(selected.birth?.date, selected.death?.date)}</span>
        </span>
        <button
          type="button"
          onClick={() => { onChange(undefined); setQuery('') }}
          className="text-xs text-slate-500 hover:text-red-600"
        >
          Fjern
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder ?? 'Søg efter person…'}
        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      {query && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-auto">
          {matches.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { onChange(p.id); setQuery('') }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex justify-between"
              >
                <span>{personDisplayName(p)}</span>
                <span className="text-slate-500">{lifespan(p.birth?.date, p.death?.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && matches.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg px-3 py-2 text-sm text-slate-500">
          Ingen personer matcher.
        </div>
      )}
    </div>
  )
}
