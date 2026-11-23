import type { IsoDate } from './date'
import type { ScheduledDose } from './vaccines'

const PRIORITY = ['late', 'ending_soon', 'due', 'upcoming']

/** Late, but the source's maximum age has not passed: it can still be given. */
export const catchable = (d: ScheduledDose, today: IsoDate) => d.status === 'late' && !!d.maxUntil && today <= d.maxUntil
/** Past the maximum age (or the source gives none): only a health worker can say what to do. */
export const missed = (d: ScheduledDose, today: IsoDate) => (d.status === 'late' && !catchable(d, today)) || d.status === 'skipped'

/**
 * The next visit. Everything that can be given now belongs to one visit (due, ending soon, late but catchable),
 * most pressing first; a late dose must never push a due one out of sight. With nothing to give now:
 * the soonest upcoming doses.
 */
export function nextVisit(doses: ScheduledDose[], today: IsoDate) {
  const now = doses.filter((d) => d.status === 'due' || d.status === 'ending_soon' || catchable(d, today))
  if (now.length) {
    const sorted = [...now].sort((a, b) => PRIORITY.indexOf(a.status) - PRIORITY.indexOf(b.status) || (a.onTimeUntil ?? '9').localeCompare(b.onTimeUntil ?? '9'))
    return { lead: sorted[0], doses: sorted }
  }
  const up = doses.filter((d) => d.status === 'upcoming').sort((a, b) => a.earliest.localeCompare(b.earliest))
  return up.length ? { lead: up[0], doses: up.filter((d) => d.earliest === up[0].earliest) } : null
}
