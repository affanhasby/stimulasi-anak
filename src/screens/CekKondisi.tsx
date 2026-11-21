import { useMemo, useState } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { IconAlert, IconBack, IconCheck, IconPhone } from '../components/icons'
import { Button, Screen } from '../components/ui'
import { HOTLINE, sourceLabel } from '../lib/content'
import { daysBetween } from '../lib/date'
import type { Child } from '../lib/db'
import { questionsFor, resultOf, type CheckResult } from '../lib/healthcheck'
import { useToday } from '../lib/hooks'
import { go } from '../lib/nav'
import { useActions, useChildRows, useStore } from '../lib/store'

const CALLS = (
  <div className="grid grid-cols-2 gap-2">
    <a href="tel:119" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger font-bold text-white active:scale-[.98]">
      <IconPhone /> Darurat 119
    </a>
    <a href={`tel:${HOTLINE.number.replace(/\D/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-panel font-bold active:scale-[.98]">
      <IconPhone /> {HOTLINE.label}
    </a>
  </div>
)

const RESULT: Record<CheckResult, { title: (n: string) => string; body: string; tone: string }> = {
  aman: { title: (n) => `Kondisi ${n} hari ini aman`, body: 'Tidak ada tanda bahaya. Tetap pantau, dan cek lagi besok.', tone: 'var(--ok)' },
  perhatian: { title: () => 'Perlu perhatian', body: 'Ada tanda kurang cairan. Susui atau beri minum lebih sering, dan hubungi bidan atau dokter hari ini.', tone: 'var(--warn)' },
  bahaya: { title: (n) => `Segera bawa ${n} ke fasilitas kesehatan`, body: 'Satu tanda bahaya saja sudah cukup alasan untuk segera diperiksa. Jangan menunggu.', tone: 'var(--color-danger)' },
}

/** Daily check: one danger sign per card, a tap for Ya/Tidak, then a plain conclusion with the next step. */
export function CekKondisi({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)
  const act = useActions()
  const { db } = useStore()
  const questions = useMemo(() => questionsFor(daysBetween(child.birth_date, today)), [child.birth_date, today])
  const saved = rows?.health.find((h) => h.day === today)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [i, setI] = useState(0)
  const [redo, setRedo] = useState(false)

  const finished = saved && !redo
  const result = finished ? saved.result : null

  const answer = async (yes: boolean) => {
    const next = { ...answers, [questions[i].id]: yes }
    setAnswers(next)
    navigator.vibrate?.(8)
    if (i + 1 < questions.length) return setI(i + 1)
    await act.saveHealthCheck(child.id, today, next, resultOf(questions, next))
    await db.notices.update(`cek-${today}`, { read_at: new Date().toISOString() })
    setRedo(false)
  }

  if (finished && result) {
    const r = RESULT[result]
    const yes = questions.filter((q) => saved.answers[q.id])
    return (
      <Screen title="Cek kondisi" onBack>
        <div className="mx-4 animate-[rise_420ms_cubic-bezier(.22,1,.36,1)]">
          <div className="flex flex-col items-center rounded-3xl bg-panel px-5 pt-8 pb-6 text-center">
            <span className="grid size-20 place-items-center rounded-full text-ground" style={{ background: r.tone }}>
              {result === 'aman' ? <IconCheck size={40} /> : <IconAlert size={40} />}
            </span>
            <h1 className="mt-4 text-2xl leading-tight font-extrabold text-balance">{r.title(child.nickname)}</h1>
            <p className="mt-2 text-base leading-relaxed text-ink-2">{r.body}</p>
          </div>
          {yes.length > 0 && (
            <div className="mt-3 rounded-2xl bg-panel p-4">
              <p className="text-[15px] font-bold">Yang Ayah/Bunda tandai:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] marker:text-danger">
                {yes.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-ink-2">Sumber: {[...new Set(yes.map((q) => sourceLabel(q.source, q.page)))].join('; ')}</p>
            </div>
          )}
          {result !== 'aman' && <div className="mt-3">{CALLS}</div>}
          <div className="mt-4 grid gap-2.5">
            <Button onClick={() => go('', true)}>Kembali ke Beranda</Button>
            <Button
              kind="secondary"
              onClick={() => {
                setAnswers({})
                setI(0)
                setRedo(true)
              }}
            >
              Cek ulang
            </Button>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{DISCLAIMER}</p>
        </div>
      </Screen>
    )
  }

  const q = questions[i]
  return (
    <Screen title="Cek kondisi hari ini" onBack bottom="none">
      <div className="flex min-h-full flex-col px-4">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-off" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={i}>
            <div className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${(i / questions.length) * 100}%` }} />
          </div>
          <span className="text-[13px] font-bold text-ink-2">
            {i + 1}/{questions.length}
          </span>
        </div>
        <p className="mt-6 text-[15px] font-semibold text-ink-2">Apakah {child.nickname} mengalami ini hari ini?</p>
        <div key={q.id} className="mt-3 animate-[slide-in_260ms_cubic-bezier(.22,1,.36,1)] rounded-3xl bg-panel p-6">
          <p className="text-2xl leading-tight font-extrabold text-balance">{q.text}</p>
          <p className="mt-3 text-[13px] text-ink-2">{q.group}</p>
        </div>
        <div className="flex-1" />
        <div className="mb-[max(16px,env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 pt-6">
          <button type="button" onClick={() => answer(true)} className="min-h-16 rounded-2xl border-2 border-danger bg-panel text-lg font-extrabold text-danger active:scale-[.97]">
            Ya
          </button>
          <button type="button" onClick={() => answer(false)} className="min-h-16 rounded-2xl bg-ink text-lg font-extrabold text-ground active:scale-[.97]">
            Tidak
          </button>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="col-span-2 flex min-h-11 items-center justify-center gap-1 text-[15px] font-semibold text-ink-2">
              <IconBack /> Pertanyaan sebelumnya
            </button>
          )}
        </div>
      </div>
    </Screen>
  )
}
