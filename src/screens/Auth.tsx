import { useState, type FormEvent } from 'react'
import { BrandPlate } from '../components/Plate'
import { Button, Field, Screen } from '../components/ui'
import { InstallBanner } from '../components/Install'
import { resendConfirmation, sendReset, signIn, signUp, USERNAME_RE, usernameAvailable } from '../lib/auth'
import { go, useRoute } from '../lib/nav'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Brand({ line }: { line: string }) {
  return (
    <div className="flex flex-col items-center pt-8 pb-6 text-center">
      <BrandPlate size={88} />
      <p className="mt-4 text-2xl font-extrabold">Stimulasi Anak</p>
      <p className="mt-1 max-w-[30ch] text-[15px] leading-snug text-ink-2">{line}</p>
    </div>
  )
}

function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kendala. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function Masuk() {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const { busy, error, run } = useSubmit()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    run(() => signIn(id, pw))
  }
  return (
    <Screen bottom="none">
      <div className="px-5">
        <Brand line="Stimulasi harian, jadwal imunisasi, dan catatan si Kecil dalam satu tempat." />
        <InstallBanner login />
        <form onSubmit={submit} noValidate>
          <Field label="Email atau username" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" required />
          <Field label="Kata sandi" reveal value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" enterKeyHint="go" required />
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-late/10 p-3 text-[15px] font-semibold text-late">
              {error}
            </p>
          )}
          <div className="mt-5">
            <Button type="submit" disabled={busy || !id || !pw}>
              {busy ? 'Masuk…' : 'Masuk'}
            </Button>
          </div>
        </form>
        {/* shortcut: "Lupa kata sandi?" stays hidden until outgoing email is set up (see DEPLOY.md); the Lupa screen remains. */}
        <div className="mt-6 border-t border-line pt-5 text-center">
          <p className="text-[15px] text-ink-2">Belum punya akun?</p>
          <div className="mt-2">
            <Button kind="secondary" onClick={() => go('daftar')}>
              Daftar
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  )
}

function Daftar() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [touched, setTouched] = useState(false)
  const { busy, error, run } = useSubmit()
  const uErr = touched && !USERNAME_RE.test(username) ? '3–20 karakter: huruf kecil, angka, titik, atau garis bawah.' : null
  const eErr = touched && !EMAIL_RE.test(email) ? 'Tulis email yang benar, mis. nama@contoh.com.' : null
  const pErr = touched && pw.length < 8 ? 'Minimal 8 karakter.' : null
  const p2Err = (touched || pw2.length >= pw.length) && pw2 && pw2 !== pw ? 'Kata sandi tidak sama.' : touched && !pw2 ? 'Ulangi kata sandi.' : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!USERNAME_RE.test(username) || !EMAIL_RE.test(email) || pw.length < 8 || pw !== pw2) return
    run(async () => {
      if (!(await usernameAvailable(username))) throw new Error('Username sudah dipakai. Coba yang lain.')
      // Without email confirmation the parent is signed in at once; with it, they are told to check their inbox.
      if (!(await signUp(username, email, pw))) go(`cek-email/${encodeURIComponent(email)}`, true)
    })
  }
  return (
    <Screen title="Daftar" onBack="masuk" bottom="none">
      <form onSubmit={submit} noValidate className="px-5 pt-2">
        <p className="mb-5 text-[15px] leading-snug text-ink-2">Cukup tiga hal. Data si Kecil diisi setelah ini.</p>
        <Field
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={20}
          hint="Untuk masuk selain email. Huruf kecil, angka, titik, garis bawah."
          error={uErr}
        />
        <Field label="Email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" autoCapitalize="none" hint="Untuk masuk dan memulihkan akun." error={eErr} />
        <Field label="Kata sandi" reveal value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" hint="Minimal 8 karakter." error={pErr} />
        <Field
          label="Ulangi kata sandi"
          reveal
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          hint={pw2 && pw2 === pw ? 'Kata sandi sama.' : undefined}
          error={p2Err}
        />
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-late/10 p-3 text-[15px] font-semibold text-late">
            {error}
          </p>
        )}
        <div className="mt-6">
          <Button type="submit" disabled={busy}>
            {busy ? 'Mendaftarkan…' : 'Daftar'}
          </Button>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          Data kesehatan si Kecil dilindungi UU No. 27/2022. Tidak ada iklan dan tidak dibagikan ke pihak ketiga. Data bisa diekspor dan dihapus kapan saja.
        </p>
      </form>
    </Screen>
  )
}

function CekEmail({ email }: { email: string }) {
  const { busy, error, run } = useSubmit()
  const [sent, setSent] = useState(false)
  return (
    <Screen bottom="none">
      <div className="px-5">
        <Brand line="Satu langkah lagi." />
        <div className="rounded-2xl bg-panel p-5">
          <h1 className="text-xl font-extrabold">Cek email Ayah/Bunda</h1>
          <p className="mt-2 text-base leading-relaxed">
            Kami mengirim tautan konfirmasi ke <b className="break-all">{email}</b>. Buka tautan itu dari HP ini, lalu Ayah/Bunda langsung masuk.
          </p>
          <p className="mt-2 text-[13px] text-ink-2">Tidak ada di kotak masuk? Periksa folder Spam atau Promosi.</p>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[15px] font-semibold text-late">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-2.5">
          <Button
            kind="secondary"
            disabled={busy || sent}
            onClick={() =>
              run(async () => {
                await resendConfirmation(email)
                setSent(true)
              })
            }
          >
            {sent ? 'Tautan baru sudah dikirim' : 'Kirim ulang tautan'}
          </Button>
          <Button kind="quiet" onClick={() => go('masuk', true)}>
            Sudah konfirmasi? Masuk
          </Button>
        </div>
      </div>
    </Screen>
  )
}

function Lupa() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, run } = useSubmit()
  return (
    <Screen title="Lupa kata sandi" onBack="masuk" bottom="none">
      <form
        className="px-5 pt-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!EMAIL_RE.test(email)) return
          run(async () => {
            await sendReset(email)
            setSent(true)
          })
        }}
      >
        <p className="mb-5 text-[15px] leading-snug text-ink-2">Masukkan email akun. Kami kirim tautan untuk membuat kata sandi baru.</p>
        <Field label="Email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" autoCapitalize="none" />
        {error && (
          <p role="alert" className="mt-3 text-[15px] font-semibold text-late">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="mt-3 rounded-xl bg-ok/10 p-3 text-[15px] font-semibold text-ok">
            Tautan sudah dikirim ke {email}.
          </p>
        )}
        <div className="mt-6">
          <Button type="submit" disabled={busy || !EMAIL_RE.test(email)}>
            {busy ? 'Mengirim…' : 'Kirim tautan'}
          </Button>
        </div>
      </form>
    </Screen>
  )
}

export function AuthScreens() {
  const route = useRoute()
  if (route === 'daftar') return <Daftar />
  if (route === 'lupa') return <Lupa />
  if (route.startsWith('cek-email/')) return <CekEmail email={route.slice('cek-email/'.length)} />
  return <Masuk />
}
