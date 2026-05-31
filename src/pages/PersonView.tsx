import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deletePersonCascade, getParents, getSpouseFamilies } from '../db'
import { personDisplayName, type Family, type Person } from '../types'
import { formatFuzzyDate, lifespan } from '../util'
import MediaImage from '../components/MediaImage'

export default function PersonView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const person = useLiveQuery(() => (id ? db.persons.get(id) : undefined), [id])
  const parents = useLiveQuery(() => (id ? getParents(id) : Promise.resolve({})), [id], {})
  const spouseFamilies = useLiveQuery(
    () => (id ? getSpouseFamilies(id) : Promise.resolve([] as Family[])),
    [id],
    [] as Family[],
  )

  if (person === undefined) return <p className="text-slate-500">Henter…</p>
  if (person === null) {
    return (
      <div>
        <p className="text-slate-500">Personen findes ikke.</p>
        <Link to="/" className="text-sm text-slate-700 underline">Tilbage til listen</Link>
      </div>
    )
  }

  async function onDelete() {
    if (!person) return
    if (!confirm(`Slet ${personDisplayName(person)}? Relationer fjernes også.`)) return
    await deletePersonCascade(person.id)
    navigate('/')
  }

  return (
    <article className="space-y-6">
      <header className="flex items-start gap-4">
        {person.photoIds[0] ? (
          <MediaImage mediaId={person.photoIds[0]} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-slate-200 flex items-center justify-center text-3xl text-slate-500 font-medium">
            {(person.givenNames[0] ?? '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{personDisplayName(person)}</h1>
          {person.nickname && <p className="text-slate-500 italic">"{person.nickname}"</p>}
          <p className="text-slate-600 text-sm mt-1">{lifespan(person.birth?.date, person.death?.date) || '—'}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to={`/person/${person.id}/edit`}
            className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-700 text-center"
          >
            Redigér
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-100"
          >
            Slet
          </button>
        </div>
      </header>

      <Section title="Begivenheder">
        <Facts person={person} />
      </Section>

      <Section title="Familie">
        <FamilyBlock parents={parents} spouseFamilies={spouseFamilies} selfId={person.id} />
      </Section>

      {person.notes && (
        <Section title="Noter">
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{person.notes}</div>
        </Section>
      )}

      {person.photoIds.length > 1 && (
        <Section title="Billeder">
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {person.photoIds.map(pid => (
              <li key={pid}>
                <MediaImage mediaId={pid} className="w-full h-32 object-cover rounded border border-slate-200" />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {person.sources && person.sources.length > 0 && (
        <Section title="Kilder">
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {person.sources.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Section>
      )}
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-2">{title}</h2>
      <div className="bg-white border border-slate-200 rounded-lg p-4">{children}</div>
    </section>
  )
}

function Facts({ person }: { person: Person }) {
  const rows: { label: string; value: string }[] = []
  if (person.birth) rows.push({ label: 'Født', value: formatEvent(person.birth) })
  if (person.baptism) rows.push({ label: 'Døbt', value: formatEvent(person.baptism) })
  if (person.death) rows.push({ label: 'Død', value: formatEvent(person.death) })
  if (person.burial) rows.push({ label: 'Begravet', value: formatEvent(person.burial) })
  for (const occ of person.occupations ?? []) rows.push({ label: 'Erhverv', value: occ })

  if (rows.length === 0) return <p className="text-slate-500 text-sm">Ingen begivenheder registreret.</p>
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map((r, i) => (
        <div key={i} className="contents">
          <dt className="text-slate-500">{r.label}</dt>
          <dd className="text-slate-800">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatEvent(event: { date?: { raw: string; iso?: string }; place?: string }): string {
  const date = formatFuzzyDate(event.date)
  return [date, event.place].filter(Boolean).join(', ')
}

function FamilyBlock({
  parents,
  spouseFamilies,
  selfId,
}: {
  parents: { father?: Person; mother?: Person }
  spouseFamilies: Family[]
  selfId: string
}) {
  const hasParents = parents.father || parents.mother
  const hasFamilies = spouseFamilies.length > 0

  if (!hasParents && !hasFamilies) {
    return <p className="text-slate-500 text-sm">Ingen relationer endnu.</p>
  }

  return (
    <div className="space-y-4 text-sm">
      {hasParents && (
        <div>
          <h3 className="text-slate-500 mb-1">Forældre</h3>
          <ul className="space-y-0.5">
            {parents.father && <li>Far: <PersonLink id={parents.father.id} /></li>}
            {parents.mother && <li>Mor: <PersonLink id={parents.mother.id} /></li>}
          </ul>
        </div>
      )}
      {spouseFamilies.map(fam => (
        <FamilyDetail key={fam.id} family={fam} selfId={selfId} />
      ))}
    </div>
  )
}

function FamilyDetail({ family, selfId }: { family: Family; selfId: string }) {
  const spouseId = family.husbandId === selfId ? family.wifeId : family.husbandId
  const spouse = useLiveQuery(async () => {
    if (!spouseId) return undefined
    return await db.persons.get(spouseId)
  }, [spouseId])
  const children = useLiveQuery(
    () => db.persons.bulkGet(family.childIds).then(arr => arr.filter((c): c is Person => c != null)),
    [family.childIds.join(',')],
    [] as Person[],
  )

  return (
    <div>
      <h3 className="text-slate-500 mb-1">
        Familie {family.marriage?.date && <span className="text-slate-400">— gift {formatFuzzyDate(family.marriage.date)}</span>}
      </h3>
      {spouse && <div>Ægtefælle: <PersonLink id={spouse.id} /></div>}
      {children.length > 0 && (
        <div className="mt-1">
          <div className="text-slate-500 text-xs">Børn:</div>
          <ul className="ml-2">
            {children.map(c => (<li key={c.id}><PersonLink id={c.id} /></li>))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PersonLink({ id }: { id: string }) {
  const person = useLiveQuery(() => db.persons.get(id), [id])
  if (!person) return <span className="text-slate-400">?</span>
  return (
    <Link to={`/person/${id}`} className="text-slate-800 underline hover:text-slate-600">
      {personDisplayName(person)}
      <span className="text-slate-400 ml-1">{lifespan(person.birth?.date, person.death?.date)}</span>
    </Link>
  )
}
