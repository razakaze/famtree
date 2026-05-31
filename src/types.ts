export type Sex = 'M' | 'F' | 'U'

export interface FuzzyDate {
  raw: string
  iso?: string
}

export interface LifeEvent {
  date?: FuzzyDate
  place?: string
  note?: string
}

export interface Person {
  id: string
  givenNames: string
  surname: string
  surnameAtBirth?: string
  nickname?: string
  sex: Sex
  birth?: LifeEvent
  baptism?: LifeEvent
  death?: LifeEvent
  burial?: LifeEvent
  occupations?: string[]
  notes?: string
  photoIds: string[]
  sources?: string[]
  createdAt: number
  updatedAt: number
}

export interface Family {
  id: string
  husbandId?: string
  wifeId?: string
  marriage?: LifeEvent
  divorce?: LifeEvent
  childIds: string[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface MediaItem {
  id: string
  filename: string
  mimeType: string
  blob: Blob
  caption?: string
  takenAt?: FuzzyDate
  createdAt: number
}

export function personDisplayName(p: Pick<Person, 'givenNames' | 'surname' | 'nickname'>): string {
  const parts = [p.givenNames, p.surname].filter(Boolean)
  const name = parts.join(' ').trim()
  return name || '(uden navn)'
}
