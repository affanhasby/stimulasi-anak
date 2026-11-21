import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, dbFor, nowIso, type AppDb, type MeasurementRow, type Child, type EventRow, type Settings } from './db'
import type { IsoDate } from './date'
import { requestSync, startAutoSync } from './sync'

type Ctx = { db: AppDb; userId: string; email: string; username: string; firstSyncDone: boolean }
const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ userId, email, username, children }: { userId: string; email: string; username: string; children: ReactNode }) {
  const db = dbFor(userId)
  const [firstSyncDone, setDone] = useState(false)
  useEffect(() => {
    const s = startAutoSync(db)
    // A new phone must see the family's data before deciding it needs onboarding; give up waiting after 6 s.
    const t = setTimeout(() => setDone(true), 6000)
    s.first.finally(() => setDone(true))
    return () => {
      clearTimeout(t)
      s.stop()
    }
  }, [db])
  return <StoreCtx.Provider value={{ db, userId, email, username, firstSyncDone }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}

export function useSettings(): Settings | undefined {
  const { db } = useStore()
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('me')) }), [db])
}

/** The active child; null once loaded when none exists yet (onboarding). */
export function useChild(): Child | null | undefined {
  const { db } = useStore()
  return useLiveQuery(async () => {
    const s = await db.settings.get('me')
    const all = (await db.children.toArray()).filter((c) => !c.deleted_at)
    return all.find((c) => c.id === s?.active_child_id) ?? all[0] ?? null
  }, [db])
}

export function useUnreadCount(childId: string) {
  const { db } = useStore()
  return useLiveQuery(() => db.notices.where('child_id').equals(childId).filter((n) => !n.read_at).count(), [db, childId]) ?? 0
}

export function useNotices(childId: string) {
  const { db } = useStore()
  return useLiveQuery(async () => (await db.notices.where('child_id').equals(childId).toArray()).sort((a, b) => b.created_at.localeCompare(a.created_at)), [db, childId])
}

export function useChildRows(childId: string) {
  const { db } = useStore()
  return useLiveQuery(
    async () => {
      const [vaccines, checks, answers, events, alertLogs, health, measurements] = await Promise.all([
        db.vaccine_records.where('child_id').equals(childId).toArray(),
        db.activity_checks.where('child_id').equals(childId).toArray(),
        db.milestone_answers.where('child_id').equals(childId).toArray(),
        db.counter_events.where('child_id').equals(childId).toArray(),
        db.alert_logs.where('child_id').equals(childId).toArray(),
        db.health_checks.where('child_id').equals(childId).toArray(),
        db.measurements.where('child_id').equals(childId).toArray(),
      ])
      return {
        vaccines: vaccines.filter((r) => !r.deleted),
        checks: checks.filter((r) => !r.deleted),
        answers: answers.filter((r) => !r.deleted),
        events: events.filter((r) => !r.deleted).sort((a, b) => a.start_at.localeCompare(b.start_at)),
        alertLogs,
        health: health.filter((r) => !r.deleted),
        measurements: measurements.filter((r) => !r.deleted).sort((a, b) => a.measured_on.localeCompare(b.measured_on)),
      }
    },
    [db, childId],
  )
}

export function actions(db: AppDb) {
  const D = { _dirty: 1 } // see sync.ts
  const after = <T,>(p: Promise<T>) => p.then((v) => (requestSync(db), v))
  return {
    async saveSettings(patch: Partial<Settings>) {
      const cur = { ...DEFAULT_SETTINGS, ...(await db.settings.get('me')) }
      await after(db.settings.put({ ...cur, ...patch, ...D, updated_at: nowIso() }))
    },
    async saveChild(child: Child) {
      await after(db.children.put({ ...child, ...D, updated_at: nowIso() }))
    },
    async toggleCheck(childId: string, day: IsoDate, activityId: string) {
      const row = await db.activity_checks.get([childId, day, activityId])
      const done = row && !row.deleted
      await after(
        db.activity_checks.put({ child_id: childId, day, activity_id: activityId, done_at: done ? row.done_at : nowIso(), deleted: !!done, ...D, updated_at: nowIso() }),
      )
    },
    /** givenDate = done; skip = not given (with reason); neither = clear the record. */
    async setVaccine(childId: string, doseKey: string, givenDate: IsoDate | null, skip?: { reason: string; note: string }) {
      await after(
        db.vaccine_records.put({ child_id: childId, dose_key: doseKey, status: skip ? 'skipped' : 'done', given_date: skip ? null : givenDate, skip_reason: skip?.reason ?? null, note: skip?.note || null, place: null, deleted: !skip && givenDate === null, ...D, updated_at: nowIso() }),
      )
    },
    async answer(childId: string, itemId: string, answer: 'yes' | 'no') {
      const prev = await db.milestone_answers.get([childId, itemId])
      const history = prev && !prev.deleted ? [...prev.history, { answer: prev.answer, at: prev.answered_at }] : (prev?.history ?? [])
      await after(db.milestone_answers.put({ child_id: childId, item_id: itemId, answer, answered_at: nowIso(), history, deleted: false, ...D, updated_at: nowIso() }))
    },
    async saveHealthCheck(childId: string, day: IsoDate, answers: Record<string, boolean>, result: 'aman' | 'perhatian' | 'bahaya') {
      await after(db.health_checks.put({ child_id: childId, day, answers, result, checked_at: nowIso(), deleted: false, ...D, updated_at: nowIso() }))
    },
    async saveMeasurement(m: Omit<MeasurementRow, 'deleted' | 'updated_at'>) {
      await after(db.measurements.put({ ...m, deleted: false, ...D, updated_at: nowIso() }))
    },
    async removeMeasurement(id: string) {
      await after(db.measurements.update(id, { deleted: true, ...D, updated_at: nowIso() }))
    },
    async addEvent(ev: Omit<EventRow, 'deleted' | 'updated_at'>) {
      await after(db.counter_events.put({ ...ev, deleted: false, ...D, updated_at: nowIso() }))
    },
    async patchEvent(id: string, patch: Partial<EventRow>) {
      await after(db.counter_events.update(id, { ...patch, ...D, updated_at: nowIso() }))
    },
    async dismissAlert(childId: string, alertId: string, day: IsoDate) {
      await after(db.alert_logs.put({ child_id: childId, alert_id: alertId, day, dismissed_at: nowIso(), ...D, updated_at: nowIso() }))
    },
    async removeEvent(id: string) {
      await after(db.counter_events.update(id, { deleted: true, ...D, updated_at: nowIso() }))
    },
    async exportAll() {
      const [children, settings, vaccine_records, activity_checks, milestone_answers, counter_events, alert_logs] = await Promise.all([
        db.children.toArray(),
        db.settings.toArray(),
        db.vaccine_records.toArray(),
        db.activity_checks.toArray(),
        db.milestone_answers.toArray(),
        db.counter_events.toArray(),
        db.alert_logs.toArray(),
      ])
      return { exported_at: nowIso(), children, settings, vaccine_records, activity_checks, milestone_answers, counter_events, alert_logs }
    },
    async wipe() {
      await db.delete()
    },
  }
}

export const useActions = () => actions(useStore().db)
