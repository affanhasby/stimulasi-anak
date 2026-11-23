import { useSyncExternalStore } from 'react'
import type { AppDb } from './db'
import { supabase } from './supabase'

// Two-way sync between the device (Dexie) and Supabase.
// Push: rows marked _dirty are upserted without updated_at, so the server stamps its own clock.
// Pull: rows with server updated_at past the stored cursor; a row still dirty here wins and is pushed next.

type Spec = { local: string; remote: string; key: string[]; cols: string[] }
// Parents before children: the server checks every child row's owner through children.
const SPECS: Spec[] = [
  { local: 'children', remote: 'children', key: ['id'], cols: ['id', 'nickname', 'birth_date', 'sex', 'gestational_weeks', 'schedule', 'je_endemic', 'rv_pentavalent', 'created_at', 'deleted_at'] },
  { local: 'vaccine_records', remote: 'vaccine_records', key: ['child_id', 'dose_key'], cols: ['child_id', 'dose_key', 'status', 'given_date', 'place', 'skip_reason', 'note', 'deleted'] },
  { local: 'activity_checks', remote: 'activity_checks', key: ['child_id', 'day', 'activity_id'], cols: ['child_id', 'day', 'activity_id', 'done_at', 'deleted'] },
  { local: 'milestone_answers', remote: 'milestone_answers', key: ['child_id', 'item_id'], cols: ['child_id', 'item_id', 'answer', 'answered_at', 'history', 'deleted'] },
  { local: 'counter_events', remote: 'counter_events', key: ['id'], cols: ['id', 'child_id', 'counter_id', 'start_at', 'end_at', 'value', 'deleted'] },
  { local: 'alert_logs', remote: 'alert_logs', key: ['child_id', 'alert_id', 'day'], cols: ['child_id', 'alert_id', 'day', 'dismissed_at'] },
  { local: 'health_checks', remote: 'health_checks', key: ['child_id', 'day'], cols: ['child_id', 'day', 'answers', 'result', 'checked_at', 'deleted'] },
  { local: 'measurements', remote: 'measurements', key: ['id'], cols: ['id', 'child_id', 'measured_on', 'weight_kg', 'length_cm', 'method', 'deleted'] },
]
// Every setting belongs to the account (push permission is the only per-device choice, kept by the browser).
export const SETTING_COLS = ['reminder_lead_days', 'reminder_time', 'email_reminders', 'enabled_counters', 'theme', 'text_size', 'active_child_id', 'seen_notices', 'log_nudges', 'recap_time', 'routine_off']

type Row = Record<string, unknown>
const pick = (r: Row, cols: string[]) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null]))
const keyOf = (r: Row, key: string[]) => (key.length === 1 ? (r[key[0]] as string) : key.map((k) => r[k] as string))

export type SyncState = { status: 'idle' | 'syncing' | 'offline' | 'error'; lastSyncedAt: string | null; pending: number; error?: string }
let state: SyncState = { status: 'idle', lastSyncedAt: null, pending: 0 }
const subs = new Set<() => void>()
const set = (s: Partial<SyncState>) => {
  state = { ...state, ...s }
  subs.forEach((f) => f())
}
export const useSyncState = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => state)

async function countPending(db: AppDb) {
  let n = 0
  for (const t of [...SPECS.map((s) => s.local), 'settings']) n += await db.table(t).filter((r) => r._dirty === 1).count()
  return n
}

async function push(db: AppDb, userId: string) {
  for (const spec of SPECS) {
    const dirty: Row[] = await db.table(spec.local).filter((r) => r._dirty === 1).toArray()
    if (!dirty.length) continue
    const { error } = await supabase.from(spec.remote).upsert(dirty.map((r) => pick(r, spec.cols)), { onConflict: spec.key.join(',') })
    if (error) throw error
    await clean(db, spec.local, spec.key, dirty)
  }
  const s: Row | undefined = await db.table('settings').get('me')
  if (s?._dirty === 1) {
    // Only the account settings changed on this device: a device holding older values for the others
    // (e.g. Safari next to the home-screen app) must not overwrite what was chosen elsewhere.
    const cols = (s._dirtyCols as string[] | undefined) ?? SETTING_COLS
    const row = { user_id: userId, ...pick(s, cols), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' })
    if (error) throw error
    await clean(db, 'settings', ['id'], [s])
  }
}

/** Clears _dirty only where the row did not change again while it was in flight. */
async function clean(db: AppDb, table: string, key: string[], sent: Row[]) {
  await db.transaction('rw', db.table(table), async () => {
    for (const r of sent) {
      const k = keyOf(r, key)
      const cur: Row | undefined = await db.table(table).get(k)
      if (cur && cur.updated_at === r.updated_at) await db.table(table).update(k, { _dirty: 0, ...(table === 'settings' ? { _dirtyCols: [] } : {}) })
    }
  })
}

async function pull(db: AppDb) {
  for (const spec of [...SPECS, { local: 'settings', remote: 'user_settings', key: ['id'], cols: SETTING_COLS }]) {
    const cursorKey = `pull:${spec.remote}`
    let cursor = (await db.table('meta').get(cursorKey))?.value ?? '1970-01-01T00:00:00Z'
    // Rows written in one request share a timestamp, so page with >= and skip what was already taken at the cursor.
    let atCursor = new Set<string>()
    for (;;) {
      const res = await supabase.from(spec.remote).select('*').gte('updated_at', cursor).order('updated_at').limit(500)
      if (res.error) throw res.error
      const full = res.data.length === 500
      const id = (r: Row) => JSON.stringify(spec.local === 'settings' ? r.user_id : keyOf(r, spec.key))
      const data = (res.data as Row[]).filter((r) => !(r.updated_at === cursor && atCursor.has(id(r))))
      if (!data.length) break
      await db.transaction('rw', db.table(spec.local), db.table('meta'), async () => {
        for (const remote of data) {
          const local = spec.local === 'settings' ? { ...remote, id: 'me', reminder_time: String(remote.reminder_time).slice(0, 5), recap_time: String(remote.recap_time ?? '20:00').slice(0, 5) } : remote
          const k = spec.local === 'settings' ? 'me' : keyOf(local, spec.key)
          const cur: Row | undefined = await db.table(spec.local).get(k)
          if (cur?._dirty === 1) continue // edited here meanwhile: this device's version is pushed next
          const fields = spec.local === 'settings' ? pick(local, [...SETTING_COLS, 'id']) : pick(local, spec.cols)
          await db.table(spec.local).put({ ...cur, ...fields, updated_at: remote.updated_at, _dirty: 0 })
        }
        const last = (data.at(-1) as Row).updated_at as string
        if (last !== cursor) atCursor = new Set()
        cursor = last
        for (const r of data) if (r.updated_at === cursor) atCursor.add(id(r))
        await db.table('meta').put({ key: cursorKey, value: cursor })
      })
      if (!full) break
    }
  }
}

let running: Promise<void> | null = null
let again = false

export async function syncNow(db: AppDb): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      if (!navigator.onLine) {
        set({ status: 'offline', pending: await countPending(db) })
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      set({ status: 'syncing' })
      await push(db, data.session.user.id)
      await pull(db)
      set({ status: 'idle', lastSyncedAt: new Date().toISOString(), pending: await countPending(db), error: undefined })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set({ status: navigator.onLine ? 'error' : 'offline', error: msg, pending: await countPending(db) })
    } finally {
      running = null
      if (again) {
        again = false
        void syncNow(db)
      }
    }
  })()
  return running
}

const timers = new WeakMap<AppDb, ReturnType<typeof setTimeout>>()
/** Debounced sync after local writes: taps feel instant and land on the server a moment later. */
export function requestSync(db: AppDb, ms = 1500) {
  clearTimeout(timers.get(db))
  set({ pending: state.pending + 1 })
  timers.set(db, setTimeout(() => void syncNow(db), ms))
}

let active: AppDb | null = null
/** Sync the signed-in user's database now (pull-to-refresh); a no-op before sign-in. */
export const syncActive = () => (active ? syncNow(active) : Promise.resolve())

/** Keeps a signed-in device in sync: on start, when back online, when reopened, and every minute. */
export function startAutoSync(db: AppDb) {
  active = db
  const run = () => void syncNow(db)
  const visible = () => document.visibilityState === 'visible' && run()
  addEventListener('online', run)
  addEventListener('offline', () => set({ status: 'offline' }))
  document.addEventListener('visibilitychange', visible)
  const t = setInterval(run, 60_000)
  const first = syncNow(db)
  return {
    first,
    stop: () => {
      if (active === db) active = null
      removeEventListener('online', run)
      document.removeEventListener('visibilitychange', visible)
      clearInterval(t)
    },
  }
}
