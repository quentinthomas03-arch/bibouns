import { useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useSession } from '@/app/session'
import { useTheme } from '@/app/theme'
import { TabBar } from '@/components/TabBar'
import { QuickSheet } from '@/components/QuickSheet'
import { Biboun } from '@/components/Biboun'
import { Soon } from '@/components/Soon'
import { Onboarding } from '@/screens/Onboarding'
import { InstallGate, isIos, isStandalone } from '@/screens/InstallGate'
import { ConfigMissing } from '@/screens/ConfigMissing'
import { Home } from '@/screens/Home'
import { Settings } from '@/screens/Settings'
import { More } from '@/screens/More'
import { Lists } from '@/screens/Lists'
import { Track } from '@/screens/Track'
import { Names } from '@/screens/Names'
import { Health } from '@/screens/Health'
import { DayJ } from '@/screens/DayJ'
import { ListDetail } from '@/screens/ListDetail'

export function App() {
  useTheme() // applique le thème choisi sur ce téléphone
  const { status } = useSession()
  const [skipInstall, setSkipInstall] = useState(false)

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
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suivi" element={<Track />} />
          <Route path="/listes" element={<Lists />} />
          <Route path="/listes/:id" element={<ListDetail />} />
          <Route path="/plus" element={<More />} />
          <Route path="/prenoms" element={<Names />} />
          <Route path="/jour-j" element={<DayJ />} />
          <Route path="/sante" element={<Health />} />
          <Route path="/souvenirs" element={<Soon title="Souvenirs" phase="Phase 3" />} />
          <Route path="/reglages" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <TabBar onQuick={() => setQuick(true)} />
      <QuickSheet open={quick} onClose={() => setQuick(false)} />
    </>
  )
}
