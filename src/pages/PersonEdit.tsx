import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, newId, now, getParents, getSpouseFamilies } from '../db'
import type { Family, LifeEvent, Person, Sex } from '../types'
import EventEditor from '../components/EventEditor'
import PersonPicker from '../components/PersonPicker'
import PhotoUploader from '../components/PhotoUploader'
import { parseFuzzyDate } from '../util'

interface MarriageDraft {
  familyId: string
  isNew: boolean
  spouseId?: string
  marriage?: LifeEvent
  childIds: string[]
}

interface FormState {
  givenNames: string
  surname: string
  surnameAtBirth: string
  nickname: string
  sex: Sex
  birth?: LifeEvent
  baptism?: LifeEvent
  death?: LifeEvent
  burial?: LifeEvent
  occupations: string[]
  notes: string
  photoIds: string[]
  sources: string[]
  fatherId?: string
  motherId?: string
  marriages: MarriageDraft[]
}

const emptyForm: FormState = {
  givenNames: '',
  surname: '',
  surnameAtBirth: '',
  nickname: '',
  sex: 'U',
  occupations: [],
  notes: '',
  photoIds: [],
  sources: [],
  marriages: [],
}

export default function PersonEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loaded, setLoaded] = useState(isNew)
  const [parentFamilyId, setParentFamilyId] = useState<string | undefined>()

  useEffect(() => {
    if (isNew) {
      setForm(emptyForm)
      setLoaded(true)
      return
    }
    if (!id) return
    let cancelled = false
    ;(async () => {
      const p = await db.persons.get(id)
      if (!p || cancelled) return
      const parents = await getParents(id)
      const spouseFamilies = await getSpouseFamilies(id)
      if (cancelled) return
      setParentFamilyId(parents.family?.id)
      setForm({
        givenNames: p.givenNames,
        surname: p.surname,
        surnameAtBirth: p.surnameAtBirth ?? '',
        nickname: p.nickname ?? '',
        sex: p.sex,
        birth: p.birth,
        baptism: p.baptism,
        death: p.death,
        burial: p.burial,
        occupations: p.occupations ?? [],
        notes: p.notes ?? '',
        photoIds: p.photoIds,
        sources: p.sources ?? [],
        fatherId: parents.family?.husbandId,
        motherId: parents.family?.wifeId,
        marriages: spouseFamilies.map(f => ({
          familyId: f.id,
          isNew: false,
          spouseId: f.husbandId === id ? f.wifeId : f.husbandId,
          marriage: f.marriage,
          childIds: f.childIds,
        })),
      })
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [id, isNew])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.givenNames.trim() && !form.surname.trim()) {
      alert('Angiv mindst et fornavn eller efternavn.')
      return
    }
    const ts = now()
    const personId = id ?? newId()

    await db.transaction('rw', db.persons, db.families, async () => {
      const personPayload: Person = {
        id: personId,
        givenNames: form.givenNames.trim(),
        surname: form.surname.trim(),
        surnameAtBirth: form.surnameAtBirth.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        sex: form.sex,
        birth: form.birth,
        baptism: form.baptism,
        death: form.death,
        burial: form.burial,
        occupations: form.occupations.filter(o => o.trim()),
        notes: form.notes.trim() || undefined,
        photoIds: form.photoIds,
        sources: form.sources.filter(s => s.trim()),
        createdAt: id ? (await db.persons.get(personId))?.createdAt ?? ts : ts,
        updatedAt: ts,
      }
      await db.persons.put(personPayload)

      const hasParents = !!form.fatherId || !!form.motherId
      if (parentFamilyId) {
        if (hasParents) {
          await db.families.update(parentFamilyId, {
            husbandId: form.fatherId,
            wifeId: form.motherId,
            updatedAt: ts,
          })
        } else {
          const fam = await db.families.get(parentFamilyId)
          if (fam) {
            const newChildren = fam.childIds.filter(c => c !== personId)
            if (newChildren.length === 0 && !fam.husbandId && !fam.wifeId) {
              await db.families.delete(parentFamilyId)
            } else {
              await db.families.update(parentFamilyId, {
                childIds: newChildren,
                updatedAt: ts,
              })
            }
          }
        }
      } else if (hasParents) {
        const fam: Family = {
          id: newId(),
          husbandId: form.fatherId,
          wifeId: form.motherId,
          childIds: [personId],
          createdAt: ts,
          updatedAt: ts,
        }
        await db.families.add(fam)
      }

      const existingSpouseFamilies = await getSpouseFamilies(personId)
      const draftFamilyIds = new Set(form.marriages.filter(m => !m.isNew).map(m => m.familyId))
      for (const fam of existingSpouseFamilies) {
        if (!draftFamilyIds.has(fam.id)) {
          if (fam.husbandId === personId) {
            const otherSpouseExists = !!fam.wifeId
            if (otherSpouseExists || fam.childIds.length > 0) {
              await db.families.update(fam.id, { husbandId: undefined, updatedAt: ts })
            } else {
              await db.families.delete(fam.id)
            }
          } else if (fam.wifeId === personId) {
            const otherSpouseExists = !!fam.husbandId
            if (otherSpouseExists || fam.childIds.length > 0) {
              await db.families.update(fam.id, { wifeId: undefined, updatedAt: ts })
            } else {
              await db.families.delete(fam.id)
            }
          }
        }
      }

      for (const m of form.marriages) {
        const isFemale = form.sex === 'F'
        const husb = isFemale ? m.spouseId : personId
        const wife = isFemale ? personId : m.spouseId
        if (m.isNew) {
          const fam: Family = {
            id: newId(),
            husbandId: husb,
            wifeId: wife,
            marriage: m.marriage,
            childIds: m.childIds,
            createdAt: ts,
            updatedAt: ts,
          }
          await db.families.add(fam)
        } else {
          await db.families.update(m.familyId, {
            husbandId: husb,
            wifeId: wife,
            marriage: m.marriage,
            childIds: m.childIds,
            updatedAt: ts,
          })
        }
      }
    })

    navigate(`/person/${personId}`)
  }

  if (!loaded) return <p className="text-slate-500">Henter…</p>

  return (
    <form onSubmit={onSave} className="space-y-6 max-w-3xl">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {isNew ? 'Ny person' : 'Redigér person'}
        </h1>
        <Link to={isNew ? '/' : `/person/${id}`} className="text-sm text-slate-600 hover:text-slate-900 underline">
          Annullér
        </Link>
      </header>

      <Card title="Identitet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Fornavne" value={form.givenNames} onChange={v => update('givenNames', v)} />
          <TextField label="Efternavn" value={form.surname} onChange={v => update('surname', v)} />
          <TextField label="Pigenavn (hvis ændret ved ægteskab)" value={form.surnameAtBirth} onChange={v => update('surnameAtBirth', v)} />
          <TextField label="Kælenavn" value={form.nickname} onChange={v => update('nickname', v)} />
          <label className="block">
            <span className="text-xs text-slate-500 block mb-0.5">Køn</span>
            <select
              value={form.sex}
              onChange={e => update('sex', e.target.value as Sex)}
              className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="U">Ukendt</option>
              <option value="M">Mand</option>
              <option value="F">Kvinde</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="Begivenheder">
        <div className="space-y-3">
          <EventEditor label="Født" value={form.birth} onChange={v => update('birth', v)} />
          <EventEditor label="Døbt" value={form.baptism} onChange={v => update('baptism', v)} />
          <EventEditor label="Død" value={form.death} onChange={v => update('death', v)} />
          <EventEditor label="Begravet" value={form.burial} onChange={v => update('burial', v)} />
        </div>
      </Card>

      <Card title="Erhverv">
        <StringList items={form.occupations} onChange={v => update('occupations', v)} placeholder="fx Tjenestekarl" />
      </Card>

      <Card title="Forældre">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Far</span>
            <PersonPicker
              value={form.fatherId}
              onChange={v => update('fatherId', v)}
              sex="M"
              excludeIds={id ? [id] : []}
            />
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Mor</span>
            <PersonPicker
              value={form.motherId}
              onChange={v => update('motherId', v)}
              sex="F"
              excludeIds={id ? [id] : []}
            />
          </div>
        </div>
      </Card>

      <Card title="Ægteskaber">
        <MarriagesEditor
          marriages={form.marriages}
          selfId={id}
          onChange={v => update('marriages', v)}
        />
      </Card>

      <Card title="Noter">
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          rows={8}
          placeholder="Biografi, anekdoter, åbne spørgsmål…"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </Card>

      <Card title="Billeder">
        <PhotoUploader photoIds={form.photoIds} onChange={v => update('photoIds', v)} />
      </Card>

      <Card title="Kilder">
        <StringList items={form.sources} onChange={v => update('sources', v)} placeholder="fx Kirkebog, Lime Sogn 1898" />
      </Card>

      <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-slate-50 py-3 -mx-4 px-4 border-t border-slate-200">
        <Link
          to={isNew ? '/' : `/person/${id}`}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
        >
          Annullér
        </Link>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-700"
        >
          Gem
        </button>
      </div>
    </form>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">{title}</h2>
      <div className="bg-white border border-slate-200 rounded-lg p-4">{children}</div>
    </section>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 block mb-0.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
      />
    </label>
  )
}

function StringList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={e => onChange(items.map((v, idx) => idx === i ? e.target.value : v))}
            placeholder={placeholder}
            className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="px-2 py-1 text-xs text-slate-500 hover:text-red-600"
          >
            Fjern
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="text-sm text-slate-700 hover:text-slate-900 underline"
      >
        + Tilføj
      </button>
    </div>
  )
}

function MarriagesEditor({
  marriages,
  selfId,
  onChange,
}: {
  marriages: MarriageDraft[]
  selfId?: string
  onChange: (next: MarriageDraft[]) => void
}) {
  function addMarriage() {
    onChange([
      ...marriages,
      { familyId: newId(), isNew: true, childIds: [] },
    ])
  }

  function updateMarriage(idx: number, patch: Partial<MarriageDraft>) {
    onChange(marriages.map((m, i) => (i === idx ? { ...m, ...patch } : m)))
  }

  function removeMarriage(idx: number) {
    onChange(marriages.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {marriages.length === 0 && <p className="text-slate-500 text-sm">Ingen ægteskaber registreret.</p>}
      {marriages.map((m, i) => (
        <div key={m.familyId} className="border border-slate-200 rounded p-3 space-y-3 bg-slate-50/50">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 font-medium">Ægteskab {i + 1}</span>
            <button
              type="button"
              onClick={() => removeMarriage(i)}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Fjern
            </button>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Ægtefælle</span>
            <PersonPicker
              value={m.spouseId}
              onChange={v => updateMarriage(i, { spouseId: v })}
              excludeIds={selfId ? [selfId] : []}
            />
          </div>
          <EventEditor
            label="Vielse"
            value={m.marriage}
            onChange={v => updateMarriage(i, { marriage: v })}
          />
          <div>
            <span className="text-xs text-slate-500 block mb-1">Børn</span>
            <ChildList
              childIds={m.childIds}
              onChange={v => updateMarriage(i, { childIds: v })}
              excludeIds={[...(selfId ? [selfId] : []), ...(m.spouseId ? [m.spouseId] : [])]}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addMarriage}
        className="text-sm text-slate-700 hover:text-slate-900 underline"
      >
        + Tilføj ægteskab
      </button>
    </div>
  )
}

function ChildList({
  childIds,
  onChange,
  excludeIds,
}: {
  childIds: string[]
  onChange: (next: string[]) => void
  excludeIds: string[]
}) {
  return (
    <div className="space-y-2">
      {childIds.map((cid, idx) => (
        <PersonPicker
          key={cid + idx}
          value={cid}
          onChange={v => {
            if (!v) onChange(childIds.filter((_, i) => i !== idx))
            else onChange(childIds.map((c, i) => (i === idx ? v : c)))
          }}
          excludeIds={[...excludeIds, ...childIds.filter((_, i) => i !== idx)]}
        />
      ))}
      <PersonPicker
        value={undefined}
        onChange={v => { if (v) onChange([...childIds, v]) }}
        excludeIds={[...excludeIds, ...childIds]}
        placeholder="Tilføj barn…"
      />
    </div>
  )
}

// `parseFuzzyDate` is re-exported here to keep tree-shaking happy in dev.
export { parseFuzzyDate as _parseFuzzyDate }
