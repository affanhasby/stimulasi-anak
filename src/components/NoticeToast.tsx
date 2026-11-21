import { useEffect, useMemo } from 'react'
import type { Child } from '../lib/db'
import { useNow } from '../lib/hooks'
import { go } from '../lib/nav'
import { currentNotices, type Notice } from '../lib/notices'
import { todayIso } from '../lib/date'
import { useActions, useChildRows, useSettings, useStore } from '../lib/store'
import { IconClose } from './icons'

/**
 * Something new (age band, checklist, vaccine due, daily check) shows once as a toast at the top and stays in
 * the in-app notification list until opened, so a missed toast or push is never lost.
 */
export function NoticeToast({ child }: { child: Child }) {
  const [now] = useNow()
  const today = todayIso(now)
  const rows = useChildRows(child.id)
  const settings = useSettings()
  const act = useActions()
  const { db } = useStore()
  const notices = useMemo(
    () => (rows ? currentNotices(child, today, rows.vaccines, { health: rows.health, answers: rows.answers, measurements: rows.measurements, hour: new Date(now).getHours() }) : []),
    [child, today, rows, now],
  )
  const seen = settings?.seen_notices
  const next = seen ? notices.find((n) => !seen.includes(n.id)) : undefined

  // Keep every notice in the in-app list; on the very first run what exists is history (already read), not news.
  useEffect(() => {
    if (!settings || !rows) return
    const first = seen === null
    void db.transaction('rw', db.notices, async () => {
      // A reminder that no longer applies (weighed, checked, vaccine given) is done: mark it read.
      const live = new Set(notices.map((n) => n.id))
      await db.notices.where('child_id').equals(child.id).filter((n) => !n.read_at && !live.has(n.id)).modify({ read_at: new Date().toISOString() })
      for (const n of notices)
        if (!(await db.notices.get(n.id)))
          await db.notices.put({ ...n, child_id: child.id, created_at: new Date().toISOString(), read_at: first ? new Date().toISOString() : null })
    })
    if (first) act.saveSettings({ seen_notices: notices.map((n) => n.id) })
  }, [settings, rows, seen, notices, act, db, child.id])

  const markSeen = (n: Notice) => act.saveSettings({ seen_notices: [...(seen ?? []), n.id] })
  useEffect(() => {
    if (!next) return
    const t = setTimeout(() => markSeen(next), 8000)
    return () => clearTimeout(t)
  })

  if (!next) return null
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[max(10px,env(safe-area-inset-top))] z-30 mx-auto flex max-w-[406px] animate-[drop_320ms_cubic-bezier(.22,1,.36,1)] items-center gap-2 rounded-2xl bg-tile py-2 pr-1.5 pl-4 text-on-tile"
    >
      <p className="min-w-0 flex-1 text-[15px] leading-snug font-semibold">{next.text}</p>
      <button
        type="button"
        onClick={async () => {
          markSeen(next)
          await db.notices.update(next.id, { read_at: new Date().toISOString() })
          go(next.route)
        }}
        className="min-h-11 shrink-0 rounded-xl bg-on-tile px-3.5 text-sm font-bold text-tile active:scale-95"
      >
        {next.action}
      </button>
      <button type="button" onClick={() => markSeen(next)} aria-label="Tutup" className="grid size-11 shrink-0 place-items-center rounded-full active:bg-tile-active">
        <IconClose />
      </button>
    </div>
  )
}
