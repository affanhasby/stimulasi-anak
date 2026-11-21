import Dexie, { type EntityTable, type Table } from 'dexie'
import type { IsoDate } from './date'
import type { ScheduleId } from './vaccines'

// Local copy on the device, shaped like the Supabase tables so sync can push rows as they are.
// Soft deletes (deleted / deleted_at) and updated_at exist for that sync; screens filter deleted rows out.

export type Child = {
  id: string
  nickname: string
  birth_date: IsoDate
  sex: 'M' | 'F' | null
  gestational_weeks: number | null
  schedule: ScheduleId
  je_endemic: boolean | null
  rv_pentavalent: boolean | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Settings = {
  id: 'me'
  reminder_lead_days: number[]
  reminder_time: string // 'HH:MM'
  email_reminders: boolean
  enabled_counters: string[] | null // null = defaults from counters.json
  theme: 'system' | 'light' | 'dark'
  text_size: 'normal' | 'large'
  active_child_id: string | null
  seen_notices: string[] | null // toasts already shown; null = take today's as the baseline
  _dirtyCols?: string[] // sync bookkeeping: account settings changed here and not yet uploaded
  updated_at: string
}

export type VaccineRow = {
  child_id: string
  dose_key: string
  status: 'done' | 'skipped'
  given_date: IsoDate | null
  place: string | null
  skip_reason?: string | null
  note?: string | null
  deleted: boolean
  updated_at: string
}
export type CheckRow = { child_id: string; day: IsoDate; activity_id: string; done_at: string; deleted: boolean; updated_at: string }
export type AnswerRow = {
  child_id: string
  item_id: string
  answer: 'yes' | 'no'
  answered_at: string
  history: { answer: 'yes' | 'no'; at: string }[]
  deleted: boolean
  updated_at: string
}
export type EventRow = {
  id: string
  child_id: string
  counter_id: string
  start_at: string
  end_at: string | null
  value: Record<string, unknown> | null
  deleted: boolean
  updated_at: string
}

export type HealthCheckRow = {
  child_id: string
  day: IsoDate
  answers: Record<string, boolean>
  result: 'aman' | 'perhatian' | 'bahaya'
  checked_at: string
  deleted: boolean
  updated_at: string
}
export type MeasurementRow = {
  id: string
  child_id: string
  measured_on: IsoDate
  weight_kg: number | null
  length_cm: number | null
  method: 'telentang' | 'berdiri' | null
  deleted: boolean
  updated_at: string
}
export type AlertRow = { child_id: string; alert_id: string; day: IsoDate; dismissed_at: string; updated_at: string }

export type AppDb = Dexie & {
  children: EntityTable<Child, 'id'>
  settings: EntityTable<Settings, 'id'>
  vaccine_records: Table<VaccineRow, [string, string]>
  activity_checks: Table<CheckRow, [string, string, string]>
  milestone_answers: Table<AnswerRow, [string, string]>
  counter_events: EntityTable<EventRow, 'id'>
  alert_logs: Table<AlertRow, [string, string, string]>
  meta: Table<{ key: string; value: string }, string>
  health_checks: Table<HealthCheckRow, [string, string]>
  measurements: EntityTable<MeasurementRow, 'id'>
  notices: EntityTable<NoticeRow, 'id'>
}

/** In-app notification history (this device only; derived, so not synced). */
export type NoticeRow = { id: string; child_id: string; text: string; route: string; action: string; created_at: string; read_at: string | null }

const dbs = new Map<string, AppDb>()

/** One database per signed-in account, so a shared phone never mixes families. */
export function dbFor(userId: string): AppDb {
  let db = dbs.get(userId)
  if (!db) {
    db = new Dexie(`stimulasi-${userId}`) as AppDb
    db.version(1).stores({
      children: 'id',
      settings: 'id',
      vaccine_records: '[child_id+dose_key], child_id',
      activity_checks: '[child_id+day+activity_id], child_id, [child_id+day]',
      milestone_answers: '[child_id+item_id], child_id',
      counter_events: 'id, child_id, [child_id+start_at]',
      alert_logs: '[child_id+alert_id+day], child_id',
    })
    // v2: _dirty marks rows changed on this device and not yet on the server; meta keeps pull cursors.
    db.version(2)
      .stores({ meta: 'key' })
      .upgrade(async (tx) => {
        for (const t of ['children', 'settings', 'vaccine_records', 'activity_checks', 'milestone_answers', 'counter_events', 'alert_logs'])
          await tx.table(t).toCollection().modify((r) => void (r._dirty = 1))
      })
    db.version(3).stores({
      health_checks: '[child_id+day], child_id',
      measurements: 'id, child_id, [child_id+measured_on]',
      notices: 'id, child_id, created_at',
    })
    dbs.set(userId, db)
  }
  return db
}

export const nowIso = () => new Date().toISOString()

export const DEFAULT_SETTINGS: Settings = {
  id: 'me',
  reminder_lead_days: [1],
  reminder_time: '07:00',
  email_reminders: false,
  enabled_counters: null,
  theme: 'system',
  text_size: 'normal',
  active_child_id: null,
  seen_notices: null,
  updated_at: new Date(0).toISOString(),
}
