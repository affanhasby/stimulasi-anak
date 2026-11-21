import { useMemo } from 'react'
import { IconChevron, IconPhone } from '../components/icons'
import { Button, Screen } from '../components/ui'
import { HOTLINE, sourceLabel } from '../lib/content'
import { daysBetween } from '../lib/date'
import type { Child } from '../lib/db'
import { questionsFor } from '../lib/healthcheck'
import { useToday } from '../lib/hooks'
import { go } from '../lib/nav'
import { useActions } from '../lib/store'

/** Emergency path: every danger sign on one screen; one tap on a sign gives the verdict and the call buttons. */
export function TandaBahaya({ child }: { child: Child }) {
  const today = useToday()
  const act = useActions()
  const questions = useMemo(() => questionsFor(daysBetween(child.birth_date, today)), [child.birth_date, today])
  const record = async (id: string | null) => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.id === id]))
    const level = id ? questions.find((q) => q.id === id)!.level : 'aman'
    await act.saveHealthCheck(child.id, today, answers, level)
    go('cek-kondisi', true)
  }
  return (
    <Screen title="Tanda bahaya" onBack bottom="none">
      <div className="px-4">
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:119" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger font-bold text-white active:scale-[.98]">
            <IconPhone /> Darurat 119
          </a>
          <a href={`tel:${HOTLINE.number.replace(/\D/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-panel font-bold active:scale-[.98]">
            <IconPhone /> {HOTLINE.label}
          </a>
        </div>
        <p className="mt-5 text-[15px] font-semibold">Ketuk yang sedang dialami {child.nickname}:</p>
        <ul className="mt-2 overflow-hidden rounded-2xl bg-panel">
          {questions.map((q) => (
            <li key={q.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => record(q.id)} className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-ground">
                <span className="min-w-0 flex-1 text-base leading-snug font-semibold">{q.text}</span>
                <IconChevron size={16} />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 px-1 text-[13px] leading-snug text-ink-2">
          Sumber: {[...new Set(questions.map((q) => sourceLabel(q.source, q.page)))].join('; ')}. Satu tanda saja sudah cukup untuk segera ke fasilitas kesehatan.
        </p>
        <div className="mt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button kind="secondary" onClick={() => record(null)}>
            Tidak ada tanda di atas
          </Button>
        </div>
      </div>
    </Screen>
  )
}
