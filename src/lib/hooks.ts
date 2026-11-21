import { useEffect, useState } from 'react'
import { todayIso } from './date'

/** Current time, refreshed every 30 s (so "terakhir", timers and the day roll over) and on demand. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    const wake = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', wake)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [everyMs])
  return [now, () => setNow(Date.now())] as const
}

/** Today's ISO date; changes at local midnight while the app is open. */
export function useToday() {
  const [now] = useNow()
  return todayIso(now)
}

/** Long-press (500 ms) without hijacking the ordinary tap. */
export function useLongPress(onLong: () => void, ms = 500) {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [fired, setFired] = useState(false)
  const cancel = () => {
    if (timer) clearTimeout(timer)
    setTimer(null)
  }
  return {
    fired,
    handlers: {
      onPointerDown: () => {
        setFired(false)
        setTimer(
          setTimeout(() => {
            setFired(true)
            navigator.vibrate?.(15)
            onLong()
          }, ms),
        )
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  }
}
