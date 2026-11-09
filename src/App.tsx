import { lazy, Suspense, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useSession } from '@/app/session'
import { useTheme } from '@/app/theme'
import { TabBar } from '@/components/TabBar'
import { QuickSheet } from '@/components/QuickSheet'
import { Biboun } from '@/components/Biboun'
import { Onboarding } from '@/screens/Onboarding'
import { InstallGate, isIos, isStandalone } from '@/screens/InstallGate'
import { ConfigMissing } from '@/screens/ConfigMissing'
import { Home } from '@/screens/Home'
import { More } from '@/screens/More'

// Écrans chargés à la demande (démarrage plus rapide). Ils restent disponibles
// hors ligne : le service worker met tous les fichiers en cache.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))
const Settings = named(() => import('@/screens/Settings'), 'Settings')
const Lists = named(() => import('@/screens/Lists'), 'Lists')
const ListDetail = named(() => import('@/screens/ListDetail'), 'ListDetail')
const Track = named(() => import('@/screens/Track'), 'Track')
const Names = named(() => import('@/screens/Names'), 'Names')
const Health = named(() => import('@/screens/Health'), 'Health')
const DayJ = named(() => import('@/screens/DayJ'), 'DayJ')
const Memories = named(() => import('@/screens/Memories'), 'Memories')
const Backup = named(() => import('@/screens/Backup'), 'Backup')
const Book = named(() => import('@/screens/Book'), 'Book')
const BirthPlan = named(() => import('@/screens/BirthPlan'), 'BirthPlan')
const Night = named(() => import('@/screens/Night'), 'Night')
const PublicWishlist = lazy(() => import('@/screens/PublicWishlist').then((m) => ({ default: m.PublicWishlist })))

export function App() {
  useTheme() // applique le thème choisi sur ce téléphone
  const { status } = useSession()
  const [skipInstall, setSkipInstall] = useState(false)

  // Liste de naissance partagée : page publique, sans compte ni installation
  const publicToken = location.hash.startsWith('#/cadeaux') ? new URLSearchParams(location.hash.split('?')[1] ?? '').get('t') : null
  if (publicToken)
    return (
      <Suspense fallback={null}>
        <PublicWishlist token={publicToken} />
      </Suspense>
    )

  if (status === 'unconfigured') return <ConfigMissing />
  if (status === 'loading')
    return (
      <div className="min-h-dvh grid place-items-center" aria-busy="true">
        <Biboun size={110} className="animate-float" title="Chargement" />
      </div>
    )
  if (status === 'onboarding') {
    if (isIos() && !isStandalone() && !skipInstall) return <InstallGate onContinue={() => setSkipInstall(true)} />
    return <Onboarding />
  }
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}

function Shell() {
  const [quick, setQuick] = useState(false)
  const night = useLocation().pathname === '/nuit'
  return (
    <>
      <main>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-[60dvh] grid place-items-center" aria-busy="true">
                <Biboun size={80} className="animate-float" title="Chargement" />
              </div>
            }
          >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suivi" element={<Track />} />
          <Route path="/listes" element={<Lists />} />
          <Route path="/listes/:id" element={<ListDetail />} />
          <Route path="/plus" element={<More />} />
          <Route path="/prenoms" element={<Names />} />
          <Route path="/jour-j" element={<DayJ />} />
          <Route path="/sante" element={<Health />} />
          <Route path="/souvenirs" element={<Memories />} />
          <Route path="/reglages" element={<Settings />} />
          <Route path="/sauvegarde" element={<Backup />} />
          <Route path="/livre" element={<Book />} />
          <Route path="/projet-naissance" element={<BirthPlan />} />
          <Route path="/nuit" element={<Night />} />
          <Route path="*" element={<Home />} />
        </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!night && <TabBar onQuick={() => setQuick(true)} />}
      <QuickSheet open={quick} onClose={() => setQuick(false)} />
    </>
  )
}
