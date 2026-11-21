import { lazy, Suspense, useEffect } from 'react'
import { NoticeToast } from './components/NoticeToast'
import { TabBar } from './components/TabBar'
import { Splash } from './components/ui'
import { useSession } from './lib/auth'
import { go, useRoute } from './lib/nav'
import { StoreProvider, useChild, useSettings, useStore } from './lib/store'
import { SERVER_READY, supabase } from './lib/supabase'
import { BrandPlate } from './components/Plate'
import { AuthScreens } from './screens/Auth'
import { Beranda } from './screens/Beranda'
import { Onboarding } from './screens/Onboarding'

// Beranda ships in the first bundle; the other tabs load when first opened.
const Stimulasi = lazy(() => import('./screens/Stimulasi').then((m) => ({ default: m.Stimulasi })))
const Imunisasi = lazy(() => import('./screens/Imunisasi').then((m) => ({ default: m.Imunisasi })))
const Kemampuan = lazy(() => import('./screens/Kemampuan').then((m) => ({ default: m.Kemampuan })))
const Lainnya = lazy(() => import('./screens/Lainnya').then((m) => ({ default: m.Lainnya })))
const CekKondisi = lazy(() => import('./screens/CekKondisi').then((m) => ({ default: m.CekKondisi })))
const Notifikasi = lazy(() => import('./screens/Notifikasi').then((m) => ({ default: m.Notifikasi })))
const Pertumbuhan = lazy(() => import('./screens/Pertumbuhan').then((m) => ({ default: m.Pertumbuhan })))
const Ukur = lazy(() => import('./screens/Ukur').then((m) => ({ default: m.Ukur })))
const TandaBahaya = lazy(() => import('./screens/TandaBahaya').then((m) => ({ default: m.TandaBahaya })))
const Rekap = lazy(() => import('./screens/Rekap').then((m) => ({ default: m.Rekap })))
const Catatan = lazy(() => import('./screens/Catatan').then((m) => ({ default: m.Catatan })))

// Task flows take the whole screen: no tab bar under their own bottom buttons.
const FOCUSED = ['cek-kondisi', 'ukur', 'tanda-bahaya']

function useTheme() {
  const s = useSettings()
  useEffect(() => {
    const root = document.documentElement
    if (!s) return
    if (s.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = s.theme
    root.dataset.text = s.text_size
  }, [s])
}

function Main() {
  useTheme()
  const child = useChild()
  const route = useRoute()
  const { firstSyncDone } = useStore()
  if (child === undefined || (child === null && !firstSyncDone)) return <Splash />
  if (child === null) return <Onboarding />

  const [top, arg] = route.split('/')
  const screen =
    top === 'stimulasi' ? <Stimulasi child={child} />
    : top === 'imunisasi' ? <Imunisasi child={child} />
    : top === 'tumbuh' ? <Kemampuan child={child} />
    : top === 'lainnya' ? <Lainnya child={child} sub={arg} />
    : top === 'catatan' && arg ? <Catatan child={child} counterId={arg} />
    : top === 'cek-kondisi' ? <CekKondisi child={child} />
    : top === 'tanda-bahaya' ? <TandaBahaya child={child} />
    : top === 'notifikasi' ? <Notifikasi child={child} />
    : top === 'rekap' ? <Rekap child={child} />
    : top === 'pertumbuhan' ? <Pertumbuhan child={child} />
    : top === 'ukur' ? <Ukur key={arg ?? 'new'} child={child} id={arg} />
    : <Beranda child={child} />
  return (
    <>
      {/* iOS 26 blurs whatever sits under the status bar; a solid fixed strip there gives it nothing to blur. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-ground" />
      <Suspense fallback={<Splash />}>{screen}</Suspense>
      <NoticeToast child={child} />
      {!FOCUSED.includes(top) && <TabBar route={route} />}
    </>
  )
}

export default function App() {
  const session = useSession()
  useEffect(() => {
    // A password-reset link signs the parent in; send them straight to setting a new password.
    const { data } = supabase.auth.onAuthStateChange((event) => event === 'PASSWORD_RECOVERY' && go('lainnya/sandi', true))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!SERVER_READY)
    return (
      <div className="mx-auto flex h-full max-w-[430px] flex-col items-center justify-center px-6 text-center">
        <BrandPlate size={88} />
        <h1 className="mt-5 text-2xl font-extrabold">Stimulasi Anak</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-2">Aplikasi sedang disiapkan. Server belum tersambung, jadi akun dan data belum bisa dipakai. Coba lagi nanti.</p>
      </div>
    )
  if (session === undefined) return <Splash />
  if (!session) return <AuthScreens />
  return (
    <StoreProvider userId={session.user.id} email={session.user.email ?? ''} username={(session.user.user_metadata?.username as string) ?? ''}>
      <Main />
    </StoreProvider>
  )
}
