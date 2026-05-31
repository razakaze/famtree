import type { Family, LifeEvent, Person, Sex } from './types'
import { newId, now } from './db'

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

interface RawRecord {
  id: string
  tag: string
  lines: RawLine[]
}

interface RawLine {
  level: number
  tag: string
  value: string
  children: RawLine[]
}

function parseLines(text: string): RawRecord[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const records: RawRecord[] = []
  let current: RawRecord | null = null
  const stack: RawLine[] = []

  for (const raw of lines) {
    const m = raw.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/)
    if (!m) continue
    const level = parseInt(m[1], 10)
    const xref = m[2]
    const tag = m[3]
    const value = m[4] ?? ''

    if (level === 0) {
      current = { id: xref ?? '', tag: xref ? tag : tag, lines: [] }
      records.push(current)
      stack.length = 0
      continue
    }

    if (!current) continue

    const line: RawLine = { level, tag, value, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
    if (stack.length === 0) {
      current.lines.push(line)
    } else {
      stack[stack.length - 1].children.push(line)
    }

    if (tag === 'CONT' || tag === 'CONC') {
      const parent = stack[stack.length - 1]
      if (parent) {
        parent.value = tag === 'CONT' ? `${parent.value}\n${value}` : `${parent.value}${value}`
      }
      continue
    }

    stack.push(line)
  }
  return records
}

function findChild(line: RawLine | undefined, tag: string): RawLine | undefined {
  return line?.children.find(c => c.tag === tag)
}

function findChildren(line: RawLine | undefined, tag: string): RawLine[] {
  return line?.children.filter(c => c.tag === tag) ?? []
}

function parseGedcomDate(value: string): string | undefined {
  if (!value) return undefined
  const tokens = value.trim().toUpperCase().split(/\s+/)
  const numerics = tokens.filter(t => /^\d+$/.test(t))
  const monthIdx = tokens.findIndex(t => MONTHS_EN.includes(t))
  if (numerics.length >= 2 && monthIdx >= 0) {
    const day = tokens[monthIdx - 1]
    const year = tokens[monthIdx + 1]
    const month = MONTHS_EN.indexOf(tokens[monthIdx]) + 1
    if (day && year && /^\d{1,2}$/.test(day) && /^\d{4}$/.test(year)) {
      return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  if (numerics.length === 1 && /^\d{4}$/.test(numerics[0])) {
    return `${numerics[0]}-01-01`
  }
  return undefined
}

function buildEvent(line: RawLine | undefined): LifeEvent | undefined {
  if (!line) return undefined
  const dateValue = findChild(line, 'DATE')?.value
  const placeValue = findChild(line, 'PLAC')?.value
  const noteValue = findChild(line, 'NOTE')?.value
  if (!dateValue && !placeValue && !noteValue && !line.value) return undefined
  const event: LifeEvent = {}
  if (dateValue) {
    const iso = parseGedcomDate(dateValue)
    event.date = { raw: dateValue, iso }
  }
  if (placeValue) event.place = placeValue
  if (noteValue) event.note = noteValue
  return event
}

function parseName(value: string): { givenNames: string; surname: string } {
  const m = value.match(/^(.*?)\s*\/(.*?)\/(.*)$/)
  if (m) {
    return { givenNames: m[1].trim(), surname: m[2].trim() }
  }
  return { givenNames: value.trim(), surname: '' }
}

function parseSex(value: string): Sex {
  const v = value.trim().toUpperCase()
  if (v === 'M') return 'M'
  if (v === 'F') return 'F'
  return 'U'
}

export interface ParsedGedcom {
  persons: Person[]
  families: Family[]
}

export function parseGedcom(text: string): ParsedGedcom {
  const records = parseLines(text)
  const personByXref = new Map<string, Person>()
  const familyByXref = new Map<string, Family>()

  for (const rec of records) {
    if (rec.tag === 'INDI') {
      const nameLine = findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'NAME')
      const { givenNames, surname } = nameLine ? parseName(nameLine.value) : { givenNames: '', surname: '' }
      const sex = parseSex(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'SEX')?.value ?? '')
      const occupations = findChildren({ children: rec.lines, level: 0, tag: '', value: '' }, 'OCCU').map(o => o.value).filter(Boolean)
      const notes = findChildren({ children: rec.lines, level: 0, tag: '', value: '' }, 'NOTE').map(n => n.value).filter(Boolean).join('\n\n')
      const sources = findChildren({ children: rec.lines, level: 0, tag: '', value: '' }, 'SOUR').map(s => s.value).filter(Boolean)

      const person: Person = {
        id: newId(),
        givenNames,
        surname,
        sex,
        birth: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'BIRT')),
        baptism: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'CHR')),
        death: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'DEAT')),
        burial: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'BURI')),
        occupations: occupations.length ? occupations : undefined,
        notes: notes || undefined,
        photoIds: [],
        sources: sources.length ? sources : undefined,
        createdAt: now(),
        updatedAt: now(),
      }
      personByXref.set(rec.id, person)
    } else if (rec.tag === 'FAM') {
      const family: Family = {
        id: newId(),
        husbandId: findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'HUSB')?.value,
        wifeId: findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'WIFE')?.value,
        childIds: findChildren({ children: rec.lines, level: 0, tag: '', value: '' }, 'CHIL').map(c => c.value),
        marriage: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'MARR')),
        divorce: buildEvent(findChild({ children: rec.lines, level: 0, tag: '', value: '' }, 'DIV')),
        createdAt: now(),
        updatedAt: now(),
      }
      familyByXref.set(rec.id, family)
    }
  }

  const resolveXref = (xref?: string): string | undefined =>
    xref ? personByXref.get(xref)?.id : undefined

  for (const family of familyByXref.values()) {
    family.husbandId = resolveXref(family.husbandId)
    family.wifeId = resolveXref(family.wifeId)
    family.childIds = family.childIds.map(resolveXref).filter((x): x is string => !!x)
  }

  return {
    persons: Array.from(personByXref.values()),
    families: Array.from(familyByXref.values()),
  }
}

function fmtDateGedcom(iso: string | undefined, raw: string | undefined): string | undefined {
  if (iso) {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const [, y, mo, d] = m
      const dayPart = raw && /^\d{4}$/.test(raw.trim()) ? '' : `${parseInt(d, 10)} `
      const monthPart = raw && /^\d{4}$/.test(raw.trim()) ? '' : `${MONTHS_EN[parseInt(mo, 10) - 1]} `
      return `${dayPart}${monthPart}${y}`.trim()
    }
  }
  return raw && raw.trim() ? raw.trim().toUpperCase() : undefined
}

function emitEvent(lines: string[], tag: string, event?: LifeEvent): void {
  if (!event) return
  if (!event.date && !event.place && !event.note) return
  lines.push(`1 ${tag}`)
  const dateStr = fmtDateGedcom(event.date?.iso, event.date?.raw)
  if (dateStr) lines.push(`2 DATE ${dateStr}`)
  if (event.place) lines.push(`2 PLAC ${event.place}`)
  if (event.note) emitMultilineNote(lines, event.note, 2)
}

function emitMultilineNote(lines: string[], text: string, level: number): void {
  const parts = text.split('\n')
  lines.push(`${level} NOTE ${parts[0]}`)
  for (let i = 1; i < parts.length; i++) {
    lines.push(`${level + 1} CONT ${parts[i]}`)
  }
}

export function writeGedcom(persons: Person[], families: Family[]): string {
  const lines: string[] = []
  lines.push('0 HEAD')
  lines.push('1 SOUR famtree')
  lines.push('2 VERS 0.1.0')
  lines.push('1 GEDC')
  lines.push('2 VERS 5.5.1')
  lines.push('2 FORM LINEAGE-LINKED')
  lines.push('1 CHAR UTF-8')
  lines.push('1 LANG Danish')

  const personXref = new Map<string, string>()
  persons.forEach((p, i) => personXref.set(p.id, `I${i + 1}`))
  const familyXref = new Map<string, string>()
  families.forEach((f, i) => familyXref.set(f.id, `F${i + 1}`))

  const famcByPerson = new Map<string, string[]>()
  const famsByPerson = new Map<string, string[]>()
  for (const fam of families) {
    const fxref = familyXref.get(fam.id)!
    if (fam.husbandId) famsByPerson.set(fam.husbandId, [...(famsByPerson.get(fam.husbandId) ?? []), fxref])
    if (fam.wifeId) famsByPerson.set(fam.wifeId, [...(famsByPerson.get(fam.wifeId) ?? []), fxref])
    for (const childId of fam.childIds) {
      famcByPerson.set(childId, [...(famcByPerson.get(childId) ?? []), fxref])
    }
  }

  for (const p of persons) {
    const xref = personXref.get(p.id)!
    lines.push(`0 @${xref}@ INDI`)
    const namePart = `${p.givenNames}${p.surname ? ` /${p.surname}/` : ''}`.trim()
    lines.push(`1 NAME ${namePart || '?'}`)
    if (p.givenNames) lines.push(`2 GIVN ${p.givenNames}`)
    if (p.surname) lines.push(`2 SURN ${p.surname}`)
    if (p.sex === 'M' || p.sex === 'F') lines.push(`1 SEX ${p.sex}`)
    emitEvent(lines, 'BIRT', p.birth)
    emitEvent(lines, 'CHR', p.baptism)
    emitEvent(lines, 'DEAT', p.death)
    emitEvent(lines, 'BURI', p.burial)
    for (const occ of p.occupations ?? []) lines.push(`1 OCCU ${occ}`)
    for (const fxref of famcByPerson.get(p.id) ?? []) lines.push(`1 FAMC @${fxref}@`)
    for (const fxref of famsByPerson.get(p.id) ?? []) lines.push(`1 FAMS @${fxref}@`)
    if (p.notes) emitMultilineNote(lines, p.notes, 1)
    for (const src of p.sources ?? []) lines.push(`1 SOUR ${src}`)
  }

  for (const fam of families) {
    const xref = familyXref.get(fam.id)!
    lines.push(`0 @${xref}@ FAM`)
    if (fam.husbandId && personXref.has(fam.husbandId)) lines.push(`1 HUSB @${personXref.get(fam.husbandId)}@`)
    if (fam.wifeId && personXref.has(fam.wifeId)) lines.push(`1 WIFE @${personXref.get(fam.wifeId)}@`)
    emitEvent(lines, 'MARR', fam.marriage)
    emitEvent(lines, 'DIV', fam.divorce)
    for (const childId of fam.childIds) {
      if (personXref.has(childId)) lines.push(`1 CHIL @${personXref.get(childId)}@`)
    }
  }

  lines.push('0 TRLR')
  return lines.join('\n') + '\n'
}
