import dangerJson from '@data/danger_signs.json'
import sourcesJson from '@data/sources.json'

const SOURCES = new Map(sourcesJson.sources.map((s) => [s.id, s]))

/** Short, human source line for UI: "Buku KIA 2021 hal. 43". */
export function sourceLabel(id: string, page?: string) {
  const s = SOURCES.get(id)
  // Kemenkes publishes several sources; its titles tell them apart, other publishers are named as is.
  const name = id === 'BUKU_KIA_2021' ? 'Buku KIA 2021' : id.startsWith('CDC_') ? 'CDC' : id.startsWith('KEMENKES_') ? `Kemenkes: ${s?.title ?? id}` : (s?.publisher ?? id)
  return page ? `${name} hal. ${page}` : name
}

export type DangerGroup = { id: string; label: string; age_days: [number, number]; rule: string; signs: string[]; source: string; page?: string }
export const DANGER_GROUPS = dangerJson.groups as DangerGroup[]
export const HOTLINE = dangerJson.hotline

export const dangerGroupsFor = (ageDays: number) =>
  DANGER_GROUPS.filter((g) => ageDays >= g.age_days[0] && ageDays <= g.age_days[1])
