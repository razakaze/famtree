import Dexie, { type Table } from 'dexie'
import type { Family, MediaItem, Person } from './types'

class FamtreeDB extends Dexie {
  persons!: Table<Person, string>
  families!: Table<Family, string>
  media!: Table<MediaItem, string>

  constructor() {
    super('famtree')
    this.version(1).stores({
      persons: 'id, surname, givenNames, sex, updatedAt',
      families: 'id, husbandId, wifeId, *childIds',
      media: 'id, filename, createdAt',
    })
  }
}

export const db = new FamtreeDB()

export function newId(): string {
  return crypto.randomUUID()
}

export function now(): number {
  return Date.now()
}

export async function getParents(personId: string): Promise<{ father?: Person; mother?: Person; family?: Family }> {
  const families = await db.families.where('childIds').equals(personId).toArray()
  if (families.length === 0) return {}
  const family = families[0]
  const [father, mother] = await Promise.all([
    family.husbandId ? db.persons.get(family.husbandId) : Promise.resolve(undefined),
    family.wifeId ? db.persons.get(family.wifeId) : Promise.resolve(undefined),
  ])
  return { father, mother, family }
}

export async function getSpouseFamilies(personId: string): Promise<Family[]> {
  const [asHusband, asWife] = await Promise.all([
    db.families.where('husbandId').equals(personId).toArray(),
    db.families.where('wifeId').equals(personId).toArray(),
  ])
  return [...asHusband, ...asWife]
}

export async function getChildren(personId: string): Promise<Person[]> {
  const families = await getSpouseFamilies(personId)
  const childIds = [...new Set(families.flatMap(f => f.childIds))]
  if (childIds.length === 0) return []
  return db.persons.bulkGet(childIds).then(arr => arr.filter((p): p is Person => p != null))
}

export async function deletePersonCascade(personId: string): Promise<void> {
  await db.transaction('rw', db.persons, db.families, async () => {
    const families = await getSpouseFamilies(personId)
    for (const fam of families) {
      const update: Partial<Family> = { updatedAt: now() }
      if (fam.husbandId === personId) update.husbandId = undefined
      if (fam.wifeId === personId) update.wifeId = undefined
      const otherSpouse = fam.husbandId === personId ? fam.wifeId : fam.husbandId
      if (!otherSpouse && fam.childIds.length === 0) {
        await db.families.delete(fam.id)
      } else {
        await db.families.update(fam.id, update)
      }
    }
    const childFamilies = await db.families.where('childIds').equals(personId).toArray()
    for (const fam of childFamilies) {
      await db.families.update(fam.id, {
        childIds: fam.childIds.filter(id => id !== personId),
        updatedAt: now(),
      })
    }
    await db.persons.delete(personId)
  })
}
