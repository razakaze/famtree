import type { FuzzyDate } from './types'

const MONTHS_DA = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

export function parseFuzzyDate(raw: string): FuzzyDate {
  const trimmed = raw.trim()
  if (!trimmed) return { raw: '' }
  const iso = tryParseToIso(trimmed)
  return iso ? { raw: trimmed, iso } : { raw: trimmed }
}

function tryParseToIso(s: string): string | undefined {
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return s
  const danishMatch = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/)
  if (danishMatch) {
    const [, d, m, y] = danishMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const yearOnly = s.match(/^(\d{4})$/)
  if (yearOnly) return `${yearOnly[1]}-01-01`
  return undefined
}

export function formatFuzzyDate(d?: FuzzyDate): string {
  if (!d || !d.raw) return ''
  if (d.iso) {
    const m = d.iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const [, y, mo, day] = m
      const monthName = MONTHS_DA[parseInt(mo, 10) - 1]
      if (day === '01' && d.raw.match(/^\d{4}$/)) return y
      return `${parseInt(day, 10)}. ${monthName} ${y}`
    }
  }
  return d.raw
}

export function lifespan(birth?: FuzzyDate, death?: FuzzyDate): string {
  const b = birth?.iso?.slice(0, 4)
  const d = death?.iso?.slice(0, 4)
  if (b && d) return `${b}–${d}`
  if (b) return `f. ${b}`
  if (d) return `d. ${d}`
  return ''
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
