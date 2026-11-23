import { useState, type ReactNode } from 'react'
import { promptInstall, useInstallMode, type InstallMode } from '../lib/install'
import { Button, Sheet } from './ui'
import { IconShare } from './icons'

const LATER = 'install-later' // per visit: the suggestion comes back the next time the app is opened in the browser

/** Step-by-step for browsers that cannot install with one tap. */
export function InstallGuide({ mode }: { mode: InstallMode }) {
  const [copied, setCopied] = useState(false)
  if (mode === 'inapp')
    return (
      <div className="text-base leading-relaxed">
        <p>Halaman ini terbuka di dalam aplikasi chat, yang tidak bisa memasang ke layar utama.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Ketuk menu (⋯ atau ⋮) di pojok layar.</li>
          <li>
            Pilih <b>Buka di Safari</b> (iPhone) atau <b>Buka di Chrome</b> (Android).
          </li>
          <li>Setelah terbuka, ketuk tombol Pasang di sana.</li>
        </ol>
        <div className="mt-4">
          <Button
            kind="secondary"
            onClick={async () => {
              await navigator.clipboard?.writeText(location.href.split('#')[0])
              setCopied(true)
            }}
          >
            {copied ? 'Tautan tersalin · tempel di Safari/Chrome' : 'Salin tautan'}
          </Button>
        </div>
      </div>
    )
  if (mode === 'ios')
    return (
      <ol className="space-y-3 text-base leading-relaxed">
        <Step n={1}>
          Ketuk tombol <b>Bagikan</b>{' '}
          <span className="inline-grid size-7 place-items-center rounded-md bg-ground align-middle text-ink">
            <IconShare />
          </span>{' '}
          di bawah layar. Kalau tidak terlihat, ketuk <b>⋯</b> dulu.
        </Step>
        <Step n={2}>
          Gulir ke bawah, pilih <b>Tambah ke Layar Utama</b>.
        </Step>
        <Step n={3}>
          Ketuk <b>Tambah</b>, lalu buka dari ikon baru di layar utama.
        </Step>
      </ol>
    )
  return (
    <p className="text-base leading-relaxed">
      Buka menu browser (⋮) lalu pilih <b>Pasang aplikasi</b> atau <b>Tambahkan ke layar utama</b>.
    </p>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-extrabold text-ground">{n}</span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** Suggests installing whenever the app is opened in a browser. One tap where the browser allows it (Android/desktop Chrome, Edge, Samsung). */
export function InstallBanner({ login = false }: { login?: boolean }) {
  const mode = useInstallMode()
  const [later, setLater] = useState(() => sessionStorage.getItem(LATER) === '1')
  const [guide, setGuide] = useState(false)
  if (mode === 'installed' || later) return null
  return (
    <section className={login ? 'mt-4 mb-2 rounded-2xl bg-panel p-3.5' : 'mx-3 mt-2 rounded-2xl bg-panel p-3.5'}>
      <div className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="text-[15px] leading-snug font-bold">Pasang di layar utama</p>
          <p className="text-[13px] leading-snug text-ink-2">
            {login ? 'Pasang dulu supaya cukup masuk sekali dan pengingat bisa muncul.' : 'Terbuka seperti aplikasi biasa, dan pengingat bisa muncul.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button full={false} onClick={() => (mode === 'prompt' ? promptInstall() : setGuide(true))}>
          {mode === 'prompt' ? 'Pasang' : 'Lihat caranya'}
        </Button>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(LATER, '1')
            setLater(true)
          }}
          className="min-h-11 px-2 text-sm font-semibold text-ink-2"
        >
          Nanti saja
        </button>
      </div>
      <Sheet open={guide} onClose={() => setGuide(false)} title="Pasang di layar utama">
        <InstallGuide mode={mode} />
      </Sheet>
    </section>
  )
}
