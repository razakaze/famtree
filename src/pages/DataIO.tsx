import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db'
import { parseGedcom, writeGedcom } from '../gedcom'
import { downloadBlob } from '../util'
import type { Family, Person } from '../types'

export default function DataIO() {
  const personCount = useLiveQuery(() => db.persons.count(), [], 0)
  const familyCount = useLiveQuery(() => db.families.count(), [], 0)
  const mediaCount = useLiveQuery(() => db.media.count(), [], 0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onExport() {
    setBusy(true)
    try {
      const [persons, families] = await Promise.all([db.persons.toArray(), db.families.toArray()])
      const text = writeGedcom(persons, families)
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const ts = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `famtree-${ts}.ged`)
      setStatus(`Eksporterede ${persons.length} personer og ${families.length} familier.`)
    } finally {
      setBusy(false)
    }
  }

  async function onImport(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const text = await file.text()
      const parsed = parseGedcom(text)
      if (parsed.persons.length === 0) {
        setStatus('Filen indeholdt ingen personer.')
        return
      }
      const replace = confirm(
        `Fundet ${parsed.persons.length} personer og ${parsed.families.length} familier.\n\n` +
        `Tryk OK for at ERSTATTE alt eksisterende data.\n` +
        `Tryk Annullér for at TILFØJE til eksisterende data.`,
      )
      const ts = now()
      const personsToInsert: Person[] = parsed.persons.map(p => ({ ...p, createdAt: ts, updatedAt: ts }))
      const familiesToInsert: Family[] = parsed.families.map(f => ({ ...f, createdAt: ts, updatedAt: ts }))

      await db.transaction('rw', db.persons, db.families, db.media, async () => {
        if (replace) {
          await db.persons.clear()
          await db.families.clear()
          await db.media.clear()
        }
        await db.persons.bulkPut(personsToInsert)
        await db.families.bulkPut(familiesToInsert)
      })
      setStatus(
        `${replace ? 'Erstattede' : 'Tilføjede'}: ${personsToInsert.length} personer og ${familiesToInsert.length} familier.`,
      )
    } catch (err) {
      setStatus(`Fejl ved import: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onWipe() {
    if (!confirm('Slet ALT data — personer, familier, billeder? Kan ikke fortrydes.')) return
    await db.transaction('rw', db.persons, db.families, db.media, async () => {
      await db.persons.clear()
      await db.families.clear()
      await db.media.clear()
    })
    setStatus('Alt data slettet.')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Importér / eksportér</h1>
        <p className="text-slate-600 text-sm">
          Træet ligger i din browser (IndexedDB). Brug GEDCOM-filer for at flytte data ind og ud — fx til upload til
          MyHeritage, Ancestry, FamilySearch eller andre værktøjer.
        </p>
      </div>

      <Card>
        <h2 className="font-medium text-slate-900 mb-2">Status</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <Stat label="Personer" value={personCount} />
          <Stat label="Familier" value={familyCount} />
          <Stat label="Billeder" value={mediaCount} />
        </dl>
      </Card>

      <Card>
        <h2 className="font-medium text-slate-900 mb-2">Eksportér GEDCOM</h2>
        <p className="text-sm text-slate-600 mb-3">
          Henter en <code>.ged</code>-fil med alle personer og familier. (Billeder eksporteres ikke i denne version.)
        </p>
        <button
          type="button"
          onClick={onExport}
          disabled={busy || personCount === 0}
          className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-700 disabled:opacity-50"
        >
          Hent GEDCOM-fil
        </button>
      </Card>

      <Card>
        <h2 className="font-medium text-slate-900 mb-2">Importér GEDCOM</h2>
        <p className="text-sm text-slate-600 mb-3">
          Læs en <code>.ged</code>-fil ind. Du får valget mellem at <strong>erstatte</strong> eller <strong>tilføje</strong>.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ged,.gedcom,text/plain"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          Vælg fil…
        </button>
      </Card>

      <Card>
        <h2 className="font-medium text-slate-900 mb-2">Nulstil</h2>
        <p className="text-sm text-slate-600 mb-3">
          Sletter alle personer, familier og billeder fra denne browser.
        </p>
        <button
          type="button"
          onClick={onWipe}
          disabled={busy}
          className="px-3 py-1.5 border border-red-300 text-red-700 rounded text-sm hover:bg-red-50 disabled:opacity-50"
        >
          Slet alt
        </button>
      </Card>

      {status && (
        <div className="border border-slate-200 bg-slate-100 text-slate-800 rounded p-3 text-sm">
          {status}
        </div>
      )}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-slate-200 rounded-lg p-4">{children}</div>
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-xl font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
