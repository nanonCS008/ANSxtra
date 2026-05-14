import clubsData from '@/data/clubs.json'
import { Club } from './types/club'

const BLANK_PLACEHOLDER_ID = 'blank'

const PinnedOrder: string[] = [
  'duke-of-edinburgh',
  'student-council',
  'school-show',
  'mun',
  'interact-club',
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

export function getClubs(): Club[] {
  const clubs = (clubsData as Club[]).filter((c) => c.id !== BLANK_PLACEHOLDER_ID)
  const byId = new Map(clubs.map((c) => [c.id, c]))
  const pinned: Club[] = []
  for (const id of PinnedOrder) {
    const club = byId.get(id)
    if (club) pinned.push(club)
  }
  const pinnedIds = new Set(PinnedOrder)
  const rest = clubs
    .filter((c) => !pinnedIds.has(c.id))
    .sort((a, b) => hashId(a.id) - hashId(b.id))

  // Explicit order tweak: swap Eco Committee and Operation Smile in the browse grid
  const iEco = rest.findIndex((c) => c.id === 'eco-committee')
  const iOs = rest.findIndex((c) => c.id === 'operation-smile')
  if (iEco !== -1 && iOs !== -1) {
    const copy = [...rest]
    copy[iEco] = rest[iOs]
    copy[iOs] = rest[iEco]
    return [...pinned, ...copy]
  }

  return [...pinned, ...rest]
}

export function getClubById(id: string): Club | undefined {
  return (clubsData as Club[]).find(club => club.id === id)
}

export function getFeaturedClubs(): Club[] {
  return getClubs().slice(0, 6)
}

