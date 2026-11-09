import { Component, type ReactNode } from 'react'
import { Biboun } from './Biboun'

/** Si un écran plante, on affiche un message gentil au lieu d'une page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Biboun’s :', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-dvh px-6 pt-safe flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto">
        <Biboun mood="wow" size={120} />
        <h1 className="text-3xl font-semibold">Oups, Biboun a trébuché</h1>
        <p className="text-ink-soft">Rien n’est perdu : vos données sont enregistrées sur le téléphone et sur le serveur.</p>
        <button onClick={() => (location.hash = '#/', location.reload())} className="press min-h-14 px-6 rounded-3xl bg-primary text-primary-ink font-bold text-lg">
          Revenir à l’accueil
        </button>
        <details className="text-xs text-ink-soft">
          <summary>Détail technique</summary>
          <code className="break-all">{this.state.error.message}</code>
        </details>
      </div>
    )
  }
}
