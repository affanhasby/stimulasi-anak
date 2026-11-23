import { useEffect, useState } from 'react'
import { needsIosGuide } from '../lib/install'
import { enablePush, PUSH_MESSAGE, pushOnHere } from '../lib/push'
import { go } from '../lib/nav'
import { Button } from './ui'
import { IconBell, IconCheck } from './icons'

const DISMISSED = 'push-cta-dismissed' // per device, like the permission itself

/**
 * One clear "turn on reminders" call: immunization reminders, routine counter reminders and the evening recap
 * all need it, and a small switch was easy to miss. `card` is the Beranda variant, which can be dismissed.
 */
export function PushCta({ card = false }: { card?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [hidden, setHidden] = useState(() => card && localStorage.getItem(DISMISSED) === '1')
  useEffect(() => {
    pushOnHere().then(setOn)
  }, [])
  if (on === null || hidden || (card && on)) return null

  if (on)
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-panel p-4 text-[15px] font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-ok text-panel">
          <IconCheck size={18} />
        </span>
        Pengingat aktif di HP ini
      </p>
    )

  const iosInstall = needsIosGuide()
  return (
    <div className={card ? 'mx-3 mt-2 rounded-2xl bg-panel p-3.5' : 'rounded-2xl bg-panel p-4'}>
      <p className="flex items-center gap-2 text-[15px] font-bold">
        <IconBell /> Nyalakan pengingat
      </p>
      <p className="mt-1 text-[13px] leading-snug text-ink-2">
        Untuk jadwal imunisasi, pengingat menyusu dan cek popok, serta rekap malam. Muncul walau aplikasi tertutup.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {iosInstall ? (
          <Button full={false} onClick={() => go('lainnya/pasang')}>
            Pasang di layar utama dulu
          </Button>
        ) : (
          <Button
            full={false}
            onClick={async () => {
              setMsg(null)
              const r = await enablePush()
              if (r === 'on') setOn(true)
              else setMsg(PUSH_MESSAGE[r])
            }}
          >
            Nyalakan
          </Button>
        )}
        {card && (
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISSED, '1')
              setHidden(true)
            }}
            className="min-h-11 px-2 text-sm font-semibold text-ink-2"
          >
            Nanti saja
          </button>
        )}
      </div>
      {iosInstall && <p className="mt-2 text-[13px] text-ink-2">Di iPhone, notifikasi hanya bisa setelah aplikasi dipasang di layar utama.</p>}
      {msg && (
        <p role="status" className="mt-2 text-[13px] font-semibold text-late">
          {msg}
        </p>
      )}
    </div>
  )
}
