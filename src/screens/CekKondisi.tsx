import { useMemo, useState } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { IconAlert, IconBack, IconCheck } from '../components/icons'
import { Button, Screen } from '../components/ui'
import { daysBetween } from '../lib/date'
import type { Child } from '../lib/db'
import { clockTime } from '../lib/counters'
import { detailOf, questionsFor, resultOf, sourcesText, type CheckResult } from '../lib/healthcheck'
import { useToday } from '../lib/hooks'
import { go } from '../lib/nav'
import { useActions, useChildRows, useStore } from '../lib/store'
import { CallButtons } from '../components/CallButtons'

const CALLS = <CallButtons panel />

const RESULT: Record<CheckResult, { title: (n: string) => string; body: string; tone: string }> = {
  aman: { title: (n) => `Kondisi ${n} hari ini aman`, body: 'Tidak ada tanda bahaya. Tetap pantau, dan cek lagi besok.', tone: 'var(--ok)' },
  perhatian: { title: () => 'Perlu perhatian', body: 'Ada tanda kurang cairan. Susui atau beri minum lebih sering, dan hubungi bidan atau dokter hari ini.', tone: 'var(--warn)' },
  bahaya: { title: (n) => `Segera bawa ${n} ke fasilitas kesehatan`, body: 'Satu tanda bahaya saja sudah cukup alasan untuk segera diperiksa. Jangan menunggu.', tone: 'var(--color-danger)' },
}

/**
 * Daily check: one topic per card, a tap for Ya/Tidak, then a plain conclusion with the next step.
 * The full check runs once a day; "Cek ulang" afterwards asks only the topics answered "Ya".
 */
export function CekKondisi({ child }: { child: Child }) {
  const today = useToday()
  const rows = useChildRows(child.id)
  const act = useActions()
  const { db } = useStore()
  const questions = useMemo(() => questionsFor(daysBetween(child.birth_date, today)), [child.birth_date, today])
  const saved = rows?.health.find((h) => h.day === today)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [i, setI] = useState(0)
  const [recheck, setRecheck] = useState(false)
  // Most days nothing is wrong: the check opens on the whole list with one "none of these" tap;
  // one question at a time only when something is.
  const [stepping, setStepping] = useState(false)

  const flagged = saved ? questions.filter((q) => saved.answers[q.id]) : []
  // Re-check only what was wrong; a check saved before the questions were grouped falls back to all of them.
  const asked = recheck ? (flagged.length ? flagged : questions) : questions
  const finished = saved && !recheck
  const result = finished ? saved.result : null

  // Set by Tanda bahaya: one tap there records a danger sign, so offer to take a mis-tap back.
  const undoRaw = sessionStorage.getItem('tb-undo')
  const undo = undoRaw ? (JSON.parse(undoRaw) as { day: string; prev: { answers: Record<string, boolean>; result: CheckResult } | null }) : null
  const takeBack = async () => {
    sessionStorage.removeItem('tb-undo')
    if (undo?.prev) await act.saveHealthCheck(child.id, today, undo.prev.answers, undo.prev.result)
    else await act.removeHealthCheck(child.id, today)
    go('', true)
  }

  const noneOfThese = async () => {
    navigator.vibrate?.(8)
    const all = Object.fromEntries(questions.map((q) => [q.id, false]))
    await act.saveHealthCheck(child.id, today, all, 'aman')
    await db.notices.update(`cek-${today}`, { read_at: new Date().toISOString() })
  }

  const answer = async (yes: boolean) => {
    const next = { ...answers, [asked[i].id]: yes }
    setAnswers(next)
    navigator.vibrate?.(8)
    if (i + 1 < asked.length) return setI(i + 1)
    const all = { ...Object.fromEntries(questions.map((q) => [q.id, false])), ...(recheck ? saved?.answers : {}), ...next }
    await act.saveHealthCheck(child.id, today, all, resultOf(questions, all))
    sessionStorage.removeItem('tb-undo')
    await db.notices.update(`cek-${today}`, { read_at: new Date().toISOString() })
    setRecheck(false)
    setStepping(false)
  }

  if (finished && result) {
    const r = RESULT[result]
    const yes = flagged
    return (
      <Screen title="Cek kondisi" onBack>
        <div className="mx-4 animate-[rise_420ms_cubic-bezier(.22,1,.36,1)]">
          <div className="flex flex-col items-center rounded-3xl bg-panel px-5 pt-8 pb-6 text-center">
            <span className="grid size-20 place-items-center rounded-full text-ground" style={{ background: r.tone }}>
              {result === 'aman' ? <IconCheck size={40} /> : <IconAlert size={40} />}
            </span>
            <h1 className="mt-4 text-2xl leading-tight font-extrabold text-balance">{r.title(child.nickname)}</h1>
            <p className="mt-2 text-base leading-relaxed text-ink-2">{r.body}</p>
            <p className="mt-3 text-[13px] font-semibold text-ink-2">Dicek pukul {clockTime(new Date(saved.checked_at))}</p>
          </div>
          {yes.length > 0 && (
            <div className="mt-3 rounded-2xl bg-panel p-4">
              <p className="text-[15px] font-bold">Yang Ayah/Bunda tandai:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] marker:text-danger">
                {yes.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-ink-2">Sumber: {sourcesText(yes)}</p>
            </div>
          )}
          {result !== 'aman' && <div className="mt-3">{CALLS}</div>}
          {undo?.day === today && result !== 'aman' && (
            <button type="button" onClick={takeBack} className="mt-3 min-h-11 w-full text-[15px] font-semibold text-ink underline underline-offset-4">
              Salah pilih? Batalkan
            </button>
          )}
          <div className="mt-4 grid gap-2.5">
            {result !== 'aman' && (
              <Button
                onClick={() => {
                  setAnswers({})
                  setI(0)
                  setRecheck(true)
                }}
              >
                Cek ulang {yes.length ? `yang bermasalah (${yes.length})` : ''}
              </Button>
            )}
            <Button kind={result === 'aman' ? 'primary' : 'secondary'} onClick={() => go('', true)}>
              Kembali ke Beranda
            </Button>
          </div>
          {result === 'aman' && (
            <p className="mt-3 text-center text-[15px] leading-relaxed text-ink-2">
              Cek lengkap berikutnya besok. Ada keluhan baru hari ini?{' '}
              <button type="button" onClick={() => go('tanda-bahaya')} className="font-semibold text-ink underline underline-offset-4">
                Lihat tanda bahaya
              </button>
            </p>
          )}
          <p className="mt-4 text-[13px] leading-relaxed text-ink-2">{DISCLAIMER}</p>
        </div>
      </Screen>
    )
  }

  if (!recheck && !stepping)
    return (
      <Screen title="Cek kondisi hari ini" onBack bottom="none">
        <div className="flex min-h-full flex-col px-4">
          <p className="text-[15px] font-semibold text-ink-2">Apakah {child.nickname} mengalami salah satu ini hari ini?</p>
          <ul className="mt-3 overflow-hidden rounded-2xl bg-panel">
            {questions.map((q) => (
              <li key={q.id} className="border-t border-line px-4 py-2.5 first:border-t-0">
                <span className="block text-base leading-snug font-bold">{q.text}</span>
                {detailOf(q).length > 0 && <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{detailOf(q).join(' · ')}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-[13px] text-ink-2">Sumber: {sourcesText(questions)}</p>
          <div className="flex-1" />
          <div className="mb-[max(16px,env(safe-area-inset-bottom))] grid gap-2.5 pt-5">
            <Button onClick={noneOfThese}>Tidak ada satu pun</Button>
            <Button kind="secondary" onClick={() => (setAnswers({}), setI(0), setStepping(true))}>
              Ada yang dialami
            </Button>
          </div>
        </div>
      </Screen>
    )

  const q = asked[i]
  return (
    <Screen title={recheck ? 'Cek ulang' : 'Cek kondisi hari ini'} onBack bottom="none">
      <div className="flex min-h-full flex-col px-4">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-off" role="progressbar" aria-valuemin={0} aria-valuemax={asked.length} aria-valuenow={i}>
            <div className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${(i / asked.length) * 100}%` }} />
          </div>
          <span className="text-[13px] font-bold text-ink-2">
            {i + 1}/{asked.length}
          </span>
        </div>
        <p className="mt-6 text-[15px] font-semibold text-ink-2">{recheck ? `Apakah ${child.nickname} masih mengalami ini?` : `Apakah ${child.nickname} mengalami ini hari ini?`}</p>
        <div key={q.id} className="mt-3 animate-[slide-in_260ms_cubic-bezier(.22,1,.36,1)] rounded-3xl bg-panel p-6">
          <p className="text-2xl leading-tight font-extrabold text-balance">{q.text}</p>
          {detailOf(q).length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-snug text-ink-2">
              {detailOf(q).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {q.signs.length > 1 && <p className="mt-3 text-[13px] text-ink-2">Jawab Ya bila ada salah satunya.</p>}
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
