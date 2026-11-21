import { useEffect, useState } from 'react'
import { disablePush, enablePush, lastTestCode, lastTestCounts, PUSH_MESSAGE, pushOnHere, TEST_MESSAGE, testPush, type TestResult } from '../lib/push'
import { Toggle } from './ui'

/** Notifications on this device (each phone subscribes on its own). */
export function PushToggle() {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [test, setTest] = useState<TestResult | 'busy' | null>(null)
  useEffect(() => {
    pushOnHere().then(setOn)
  }, [])
  return (
    <>
      <Toggle
        label="Notifikasi di HP ini"
        hint={msg ?? 'Muncul walau aplikasi tertutup'}
        checked={on}
        onChange={async (v) => {
          setMsg(null)
          if (!v) {
            await disablePush()
            setOn(false)
            return
          }
          const r = await enablePush()
          setOn(r === 'on')
          if (r !== 'on') setMsg(PUSH_MESSAGE[r])
        }}
      />
      {on && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            disabled={test === 'busy'}
            onClick={async () => {
              setTest('busy')
              setTest(await testPush())
            }}
            className="min-h-11 w-full rounded-xl border border-line text-[15px] font-bold active:scale-[.98] disabled:opacity-60"
          >
            {test === 'busy' ? 'Mengirim…' : 'Kirim notifikasi uji ke semua HP'}
          </button>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-2">Dikirim ke setiap HP yang login dengan akun ini dan sudah menyalakan notifikasi.</p>
          {test && test !== 'busy' && (
            <p role="status" className={`mt-2 text-[13px] leading-snug ${test === 'sent' ? 'text-ink' : 'text-late'}`}>
              {(test === 'sent' || test === 'error' || test === 'gone') && (
                <b className="block">
                  Terkirim ke {lastTestCounts.sent} HP{lastTestCounts.failed ? `, gagal di ${lastTestCounts.failed} HP` : ''}
                  {lastTestCounts.gone ? `, ${lastTestCounts.gone} HP sudah tidak terdaftar` : ''}.
                </b>
              )}
              {TEST_MESSAGE[test]}
              {test === 'error' && lastTestCode ? ` (kode ${lastTestCode})` : ''}
            </p>
          )}
        </div>
      )}
    </>
  )
}
