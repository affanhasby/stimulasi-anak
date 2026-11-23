import { useState, type ReactNode } from 'react'
import { DISCLAIMER } from '../components/DangerSheet'
import { BrandPlate } from '../components/Plate'
import { PushToggle } from '../components/PushToggle'
import { Button, Chip, Field, Row, Screen, Section, Sheet, Toggle, PickerInput } from '../components/ui'
import { deleteAccount, signOut, updatePassword } from '../lib/auth'
import { clockTime } from '../lib/counters'
import { syncNow, useSyncState } from '../lib/sync'
import { ageInMonths, todayIso } from '../lib/date'
import type { Child } from '../lib/db'
import { COUNTERS, visibleCounters } from '../lib/counters'
import { longDate } from '../lib/format'
import { downloadFile } from '../lib/ics'
import { isStandalone, needsIosGuide, promptInstall, useCanInstall } from '../lib/install'
import { back, go } from '../lib/nav'
import { useActions, useSettings, useStore } from '../lib/store'
import { routinesFor } from '../lib/routines'
import { REMINDER_OPTIONS } from '../lib/vaccines'
import sourcesJson from '@data/sources.json'

const LEAD_LABEL: Record<number, string> = { 0: 'Hari-H', 1: 'H-1', 2: 'H-2', 3: 'H-3', 7: 'H-7' }

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen title={title} onBack="lainnya">
      {children}
    </Screen>
  )
}

function Profil({ child }: { child: Child }) {
  const act = useActions()
  const [draft, setDraft] = useState(child)
  const today = todayIso()
  const set = <K extends keyof Child>(k: K, v: Child[K]) => setDraft({ ...draft, [k]: v })
  const changed = JSON.stringify(draft) !== JSON.stringify(child)
  return (
    <Sub title="Profil anak">
      <div className="px-4">
        <Field label="Nama panggilan" value={draft.nickname} maxLength={40} onChange={(e) => set('nickname', e.target.value)} />
        <Field label="Tanggal lahir" type="date" value={draft.birth_date} max={today} onChange={(e) => e.target.value && set('birth_date', e.target.value)} hint="Mengubah tanggal lahir menyusun ulang semua jadwal." />
        <p className="mt-4 text-[15px] font-semibold">Jenis kelamin</p>
        <div className="mt-1.5 flex gap-2">
          <Chip selected={draft.sex === 'M'} onClick={() => set('sex', draft.sex === 'M' ? null : 'M')}>Laki-laki</Chip>
          <Chip selected={draft.sex === 'F'} onClick={() => set('sex', draft.sex === 'F' ? null : 'F')}>Perempuan</Chip>
        </div>
        <p className="mt-4 text-[15px] font-semibold">Lahir prematur</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Chip selected={!draft.gestational_weeks} onClick={() => set('gestational_weeks', null)}>Tidak</Chip>
          <Chip selected={!!draft.gestational_weeks} onClick={() => set('gestational_weeks', draft.gestational_weeks ?? 34)}>Ya</Chip>
          {!!draft.gestational_weeks && (
            <label className="flex items-center gap-2 text-[15px]">
              <input type="number" inputMode="numeric" min={22} max={36} value={draft.gestational_weeks} onChange={(e) => set('gestational_weeks', Math.min(36, Math.max(22, Number(e.target.value) || 22)))} className="min-h-11 w-20 rounded-xl border border-line bg-panel px-3 text-center font-bold" />
              minggu
            </label>
          )}
        </div>
        <p className="mt-4 text-[15px] font-semibold">Jadwal imunisasi</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Chip selected={draft.schedule === 'KEMENKES'} onClick={() => set('schedule', 'KEMENKES')}>Program pemerintah</Chip>
          <Chip selected={draft.schedule === 'IDAI'} onClick={() => set('schedule', 'IDAI')}>IDAI / swasta</Chip>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-2">Dosis yang sudah ditandai tidak terhapus saat jadwal diganti.</p>
        <div className="mt-6">
          <Button
            disabled={!changed || !draft.nickname.trim()}
            onClick={async () => {
              await act.saveChild({ ...draft, nickname: draft.nickname.trim() })
              back('lainnya')
            }}
          >
            Simpan
          </Button>
        </div>
      </div>
    </Sub>
  )
}

function Pengingat({ child }: { child: Child }) {
  const s = useSettings()
  const act = useActions()
  if (!s) return null
  const lead = s.reminder_lead_days
  // Every routine this child's active buttons have, switched on or off (switching keeps the list stable).
  const routines = routinesFor(ageInMonths(child.birth_date, todayIso()), s.enabled_counters, [])
  return (
    <Sub title="Pengingat & notifikasi">
      <Section title="Kapan diingatkan" note="Relatif ke tanggal 'Mulai bisa'. Pengingat tambahan 3 hari sebelum batas bila belum ditandai.">
        <div className="flex flex-wrap gap-2 p-4">
          {REMINDER_OPTIONS.lead_time_days_choices.map((d) => (
            <Chip key={d} check selected={lead.includes(d)} onClick={() => act.updateSettings((c) => ({ reminder_lead_days: c.reminder_lead_days.includes(d) ? c.reminder_lead_days.filter((x) => x !== d) : [...c.reminder_lead_days, d].sort((a, b) => a - b) }))}>
              {LEAD_LABEL[d] ?? `H-${d}`}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="Jam">
        <div className="p-4">
          <PickerInput type="time" label="Jam pengingat" value={s.reminder_time} onChange={(v) => v && act.saveSettings({ reminder_time: v })} />
        </div>
      </Section>
      <Section title="Notifikasi" note="Dipakai untuk pengingat imunisasi dan timer tidur/tengkurap yang sedang berjalan. Jadwal juga bisa disimpan ke kalender HP dari tab Imunisasi.">
        <PushToggle />
        {/* shortcut: email reminders hidden until outgoing email is set up (DEPLOY.md). */}
      </Section>
      <Section
        title="Pengingat rutin"
        note="Untuk tombol penghitung yang aktif. Hanya dikirim bila ada catatan dalam 2 hari terakhir. Antara pukul 21.00–07.00 hanya pengingat menyusu (bila dinyalakan)."
      >
        {routines.length === 0 && <p className="px-4 py-4 text-[15px] text-ink-2">Tidak ada tombol aktif yang punya pengingat rutin.</p>}
        {routines.map((r) => (
          <Toggle
            key={r.id}
            label={r.label}
            hint={r.rule}
            checked={!s.routine_off.includes(r.id)}
            onChange={(v) => act.updateSettings((c) => ({ routine_off: v ? c.routine_off.filter((x) => x !== r.id) : [...c.routine_off.filter((x) => x !== r.id), r.id] }))}
          />
        ))}
        {routines.some((r) => r.id === 'feed') && !s.routine_off.includes('feed') && (
          <Toggle
            label="Menyusu juga malam hari"
            hint="Bayi tetap perlu menyusu di malam hari; pengingat lain tetap diam 21.00–07.00"
            checked={s.feed_at_night}
            onChange={(v) => act.saveSettings({ feed_at_night: v })}
          />
        )}
      </Section>
      <Section title="Rekap malam" note="Mengingatkan untuk mengisi BAB, pipis, atau menyusu yang lupa dicatat hari itu.">
        <Toggle label="Rekap malam" hint="Lewati bila hari itu sudah diisi" checked={s.log_nudges} onChange={(v) => act.saveSettings({ log_nudges: v })} />
        {s.log_nudges && (
          <div className="border-t border-line p-4">
            <p className="mb-1.5 text-[15px] font-semibold">Jam rekap malam</p>
            <PickerInput type="time" label="Jam rekap malam" value={s.recap_time} onChange={(v) => v && act.saveSettings({ recap_time: v })} />
          </div>
        )}
      </Section>
    </Sub>
  )
}

function Penghitung({ child }: { child: Child }) {
  const s = useSettings()
  const act = useActions()
  if (!s) return null
  const m = ageInMonths(child.birth_date, todayIso())
  const on = new Set(visibleCounters(m, s.enabled_counters).map((c) => c.id))
  const available = COUNTERS.filter((c) => c.type !== 'derived' && m >= c.visible_months[0] && m < c.visible_months[1])
  const toggle = (id: string, v: boolean) => act.saveSettings({ enabled_counters: available.filter((c) => (c.id === id ? v : on.has(c.id))).map((c) => c.id) })
  return (
    <Sub title="Tombol penghitung">
      <Section note="Beranda menampilkan sampai 5 tombol. Tombol yang tidak sesuai usia tersembunyi otomatis.">
        {available.map((c) => (
          <Toggle key={c.id} label={c.label} checked={on.has(c.id)} onChange={(v) => toggle(c.id, v)} />
        ))}
      </Section>
    </Sub>
  )
}

function Tampilan() {
  const s = useSettings()
  const act = useActions()
  if (!s) return null
  return (
    <Sub title="Tampilan">
      <Section title="Tema" note="Mode gelap nyaman untuk menyusui malam.">
        <div className="flex flex-wrap gap-2 p-4">
          {([['system', 'Ikuti HP'], ['light', 'Terang'], ['dark', 'Gelap']] as const).map(([v, l]) => (
            <Chip key={v} selected={s.theme === v} onClick={() => act.saveSettings({ theme: v })}>{l}</Chip>
          ))}
        </div>
      </Section>
      <Section title="Ukuran teks">
        <div className="flex flex-wrap gap-2 p-4">
          <Chip selected={s.text_size === 'normal'} onClick={() => act.saveSettings({ text_size: 'normal' })}>Normal</Chip>
          <Chip selected={s.text_size === 'large'} onClick={() => act.saveSettings({ text_size: 'large' })}>Besar</Chip>
        </div>
      </Section>
    </Sub>
  )
}

function Pasang() {
  const can = useCanInstall()
  return (
    <Sub title="Pasang di layar utama">
      <div className="px-4">
        {isStandalone() ? (
          <p className="rounded-2xl bg-panel p-4 text-base">Aplikasi sudah terpasang di HP ini.</p>
        ) : can ? (
          <>
            <p className="text-base leading-relaxed">Pasang supaya terbuka seperti aplikasi biasa, langsung dari layar utama, dan tetap bisa dipakai tanpa sinyal.</p>
            <div className="mt-4">
              <Button onClick={promptInstall}>Pasang sekarang</Button>
            </div>
          </>
        ) : needsIosGuide() ? (
          <ol className="list-decimal space-y-2 rounded-2xl bg-panel p-4 pl-9 text-base leading-relaxed">
            <li>Buka halaman ini di Safari.</li>
            <li>Ketuk tombol Bagikan (kotak dengan panah ke atas) di bawah layar.</li>
            <li>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li>
            <li>Buka dari ikon baru di layar utama. Notifikasi di iPhone hanya bisa setelah dipasang (iOS 16.4+).</li>
          </ol>
        ) : (
          <p className="rounded-2xl bg-panel p-4 text-base leading-relaxed">Buka menu browser (⋮) lalu pilih <b>Pasang aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</p>
        )}
      </div>
    </Sub>
  )
}

function Sumber() {
  return (
    <Sub title="Sumber & catatan">
      <p className="mx-4 rounded-2xl bg-panel p-4 text-[15px] leading-relaxed">{DISCLAIMER}</p>
      <Section title="Sumber rujukan">
        {sourcesJson.sources.map((s) => (
          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="block border-t border-line px-4 py-3 first:border-t-0 active:bg-ground">
            <span className="block text-[15px] leading-snug font-semibold">{s.title}</span>
            <span className="block text-[13px] text-ink-2">
              {s.publisher}
              {s.date ? ` · ${s.date}` : ''}
            </span>
          </a>
        ))}
      </Section>
      <p className="mx-4 mt-3 text-[13px] text-ink-2">Data konten per {longDate(sourcesJson.as_of)}.</p>
    </Sub>
  )
}

function Sandi() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Sub title="Kata sandi baru">
      <form
        className="px-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await updatePassword(pw)
            setMsg({ ok: true, text: 'Kata sandi sudah diganti.' })
            setPw('')
          } catch (err) {
            setMsg({ ok: false, text: (err as Error).message })
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Kata sandi baru" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} hint="Minimal 8 karakter." />
        {msg && <p role="status" className={`mt-3 text-[15px] font-semibold ${msg.ok ? 'text-ok' : 'text-late'}`}>{msg.text}</p>}
        <div className="mt-5">
          <Button type="submit" disabled={busy || pw.length < 8}>Simpan</Button>
        </div>
      </form>
    </Sub>
  )
}

export function Lainnya({ child, sub }: { child: Child; sub?: string }) {
  const { email, username, db } = useStore()
  const act = useActions()
  const sync = useSyncState()
  const [confirm, setConfirm] = useState<'device' | 'account' | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const syncText =
    sync.status === 'syncing' ? 'Menyimpan…'
    : sync.status === 'offline' ? `Offline${sync.pending ? ` · ${sync.pending} menunggu` : ''}`
    : sync.status === 'error' ? 'Gagal · ketuk untuk coba lagi'
    : sync.lastSyncedAt ? `Tersimpan ${clockTime(new Date(sync.lastSyncedAt))}`
    : 'Menunggu'

  if (sub === 'profil') return <Profil child={child} />
  if (sub === 'pengingat') return <Pengingat child={child} />
  if (sub === 'penghitung') return <Penghitung child={child} />
  if (sub === 'tampilan') return <Tampilan />
  if (sub === 'pasang') return <Pasang />
  if (sub === 'sumber') return <Sumber />
  if (sub === 'sandi') return <Sandi />

  return (
    <Screen title="Pengaturan" onBack>
      <Section title="Si Kecil">
        <Row label={child.nickname} value={longDate(child.birth_date)} onClick={() => go('lainnya/profil')} />
      </Section>
      <Section title="Aplikasi">
        <Row label="Pengingat & notifikasi" onClick={() => go('lainnya/pengingat')} />
        <Row label="Tombol penghitung" onClick={() => go('lainnya/penghitung')} />
        <Row label="Tampilan" onClick={() => go('lainnya/tampilan')} />
        {!isStandalone() && <Row label="Pasang di layar utama" onClick={() => go('lainnya/pasang')} />}
      </Section>
      <Section title="Akun">
        <Row label="Email" value={<span className="block max-w-[200px] truncate">{email}</span>} />
        {username && <Row label="Username" value={username} />}
        <Row label="Ganti kata sandi" onClick={() => go('lainnya/sandi')} />
        <Row label="Keluar" onClick={() => signOut()} />
      </Section>
      <Section title="Penyimpanan" note="Data tersimpan di HP ini dan otomatis disalin ke server, jadi bisa dibuka dari HP lain dengan akun yang sama.">
        <Row label="Sinkronisasi" value={syncText} onClick={() => syncNow(db)} />
      </Section>
      <Section title="Data" note="Data kesehatan anak dilindungi UU No. 27/2022. Tanpa iklan dan tidak dibagikan ke pihak ketiga.">
        <Row
          label="Ekspor data (JSON)"
          onClick={async () => downloadFile(`stimulasi-anak-${todayIso()}.json`, JSON.stringify(await act.exportAll(), null, 2), 'application/json')}
        />
        <Row label="Hapus data di HP ini" onClick={() => setConfirm('device')} />
        <Row label={<span className="font-semibold text-late">Hapus akun</span>} onClick={() => setConfirm('account')} />
      </Section>
      <Section title="Tentang">
        <Row label="Sumber & catatan medis" onClick={() => go('lainnya/sumber')} />
      </Section>
      <div className="mt-8 flex flex-col items-center pb-4 text-center">
        <BrandPlate size={40} />
        <p className="mt-2 text-[13px] text-ink-2">Stimulasi Anak · versi {__APP_VERSION__}</p>
      </div>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'account' ? 'Hapus akun?' : 'Hapus data di HP ini?'}>
        <p className="text-base leading-relaxed">
          {confirm === 'account'
            ? `Akun dan semua data ${child.nickname} di server serta di HP ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan. Ekspor data dulu bila ingin menyimpan salinan.`
            : `Catatan di HP ini dihapus dan Ayah/Bunda keluar dari akun. Data yang sudah tersimpan di server tetap aman; masuk lagi untuk memulihkannya.${sync.pending ? ` Ada ${sync.pending} perubahan yang belum tersimpan ke server dan akan hilang.` : ''}`}
        </p>
        {err && <p role="alert" className="mt-3 text-[15px] font-semibold text-late">{err}</p>}
        <div className="mt-5 grid gap-2.5">
          <Button
            kind="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setErr(null)
              try {
                if (confirm === 'account') await deleteAccount()
                await act.wipe()
                if (confirm === 'device') await signOut()
                location.replace(location.pathname)
              } catch (e) {
                setErr((e as Error).message)
                setBusy(false)
              }
            }}
          >
            {confirm === 'account' ? 'Hapus akun permanen' : 'Hapus dan keluar'}
          </Button>
          <Button kind="secondary" onClick={() => setConfirm(null)}>Batal</Button>
        </div>
      </Sheet>
    </Screen>
  )
}
