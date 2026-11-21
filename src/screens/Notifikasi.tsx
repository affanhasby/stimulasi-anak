import { IconBell, IconChevron } from '../components/icons'
import { Screen } from '../components/ui'
import type { Child } from '../lib/db'
import { clockTime } from '../lib/counters'
import { shortDate } from '../lib/format'
import { go } from '../lib/nav'
import { useNotices, useStore } from '../lib/store'

/** Everything the app (or a push) told the parent, newest first; each opens the page where the action is. */
export function Notifikasi({ child }: { child: Child }) {
  const list = useNotices(child.id)
  const { db } = useStore()
  const unread = list?.filter((n) => !n.read_at).length ?? 0
  const readAll = () => db.notices.where('child_id').equals(child.id).modify((n) => void (n.read_at ??= new Date().toISOString()))
  return (
    <Screen
      title="Notifikasi"
      onBack
      action={
        unread > 0 && (
          <button type="button" onClick={readAll} className="min-h-11 rounded-full px-3 text-sm font-bold active:bg-off">
            Tandai dibaca
          </button>
        )
      }
    >
      {list && list.length === 0 && (
        <div className="mx-4 mt-10 flex flex-col items-center text-center text-ink-2">
          <IconBell />
          <p className="mt-2 text-base">Belum ada notifikasi.</p>
        </div>
      )}
      <ul className="mx-3 mt-1 overflow-hidden rounded-2xl bg-panel">
        {list?.map((n) => (
          <li key={n.id} className="border-t border-line first:border-t-0">
            <button
              type="button"
              onClick={async () => {
                await db.notices.update(n.id, { read_at: n.read_at ?? new Date().toISOString() })
                go(n.route)
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-ground"
            >
              <span className={`size-2.5 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-ink'}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={`block text-[15px] leading-snug ${n.read_at ? 'text-ink-2' : 'font-bold'}`}>{n.text}</span>
                <span className="block text-[13px] text-ink-2">
                  {shortDate(n.created_at.slice(0, 10))}, {clockTime(new Date(n.created_at))} · {n.action}
                </span>
              </span>
              <IconChevron size={16} />
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
