import { useEffect, useState } from 'react'
import { disablePush, enablePush, PUSH_MESSAGE, pushOnHere } from '../lib/push'
import { Toggle } from './ui'

/** Notifications on this device (each phone subscribes on its own). */
export function PushToggle() {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
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
    </>
  )
}
