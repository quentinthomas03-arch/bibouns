import { useState, type FormEvent } from 'react'
import { ArrowLeft, Copy, Share2, KeyRound, UserPlus, Home as HomeIcon } from 'lucide-react'
import { Biboun } from '@/components/Biboun'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { useSession } from '@/app/session'
import { avatars, errors, memberColors, onboarding as t } from '@/content/fr'

type Step = 'welcome' | 'create' | 'join' | 'recover' | 'codes'

interface Result {
  ok: boolean
  household_id?: string
  member_id?: string
  invite_code?: string
  recovery_code?: string
}

const appUrl = () => location.origin + location.pathname

/** Parcours de première ouverture : créer / rejoindre / récupérer un foyer. */
export function Onboarding() {
  const { rpc, enter } = useSession()
  const [step, setStep] = useState<Step>('welcome')
  const [firstName, setFirstName] = useState('')
  const [avatar, setAvatar] = useState(avatars[0])
  const [color, setColor] = useState(memberColors[0])
  const [dueDate, setDueDate] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)

  const go = (s: Step) => {
    setError(null)
    setStep(s)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const profile = { p_first_name: firstName.trim(), p_color: color, p_avatar: avatar }
    const r =
      step === 'create'
        ? await rpc('create_household', profile)
        : step === 'join'
          ? await rpc('join_household', { ...profile, p_code: code })
          : await rpc('recover_member', { p_recovery_code: code })
    setBusy(false)
    if (!r.ok) {
      setError(errors[r.error ?? 'inconnu'] ?? errors.inconnu)
      return
    }
    if (step === 'recover') {
      await enter(r)
      return
    }
    setResult(r)
    setStep('codes')
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* presse-papier indisponible */
    }
  }

  async function share(invite: string) {
    const text = t.shareMessage(invite, appUrl())
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        /* annulé */
      }
    } else void copy(text)
  }

  return (
    <main className="min-h-dvh px-5 pt-safe pb-safe flex flex-col max-w-lg mx-auto">
      {step !== 'welcome' && step !== 'codes' && (
        <button onClick={() => go('welcome')} className="press mt-2 self-start flex items-center gap-1 min-h-11 font-bold text-ink-soft">
          <ArrowLeft size={20} /> {t.back}
        </button>
      )}

      {step === 'welcome' && (
        <div className="flex-1 flex flex-col justify-center gap-6 py-8">
          <div className="flex flex-col items-center text-center gap-3">
            <Biboun size={150} className="animate-float" />
            <h1 className="text-4xl font-semibold leading-tight">{t.welcomeTitle}</h1>
            <p className="text-ink-soft text-lg">{t.welcomeText}</p>
          </div>
          <div className="flex flex-col gap-3">
            <ChoiceButton icon={<HomeIcon />} title={t.create} hint={t.createHint} onClick={() => go('create')} primary />
            <ChoiceButton icon={<UserPlus />} title={t.join} hint={t.joinHint} onClick={() => go('join')} />
            <ChoiceButton icon={<KeyRound />} title={t.recover} hint={t.recoverHint} onClick={() => go('recover')} />
          </div>
        </div>
      )}

      {(step === 'create' || step === 'join' || step === 'recover') && (
        <form onSubmit={submit} className="flex flex-col gap-5 py-4">
          <h1 className="text-3xl font-semibold">{step === 'create' ? t.create : step === 'join' ? t.join : t.recover}</h1>

          {(step === 'join' || step === 'recover') && (
            <Field
              label={step === 'join' ? t.inviteCode : t.recoveryCode}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={step === 'join' ? 'ABC234' : 'XXXX-XXXX-XXXX-XXXX'}
              required
              className="[&_input]:font-display [&_input]:text-2xl [&_input]:tracking-widest"
            />
          )}

          {step !== 'recover' && (
            <>
              <Field label={t.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Quentin, Aude…" autoComplete="given-name" maxLength={40} required />
              <fieldset>
                <legend className="font-bold mb-2 px-1">{t.pickAvatar}</legend>
                <div className="grid grid-cols-8 gap-2">
                  {avatars.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      aria-label={`Avatar ${a}`}
                      className={`press aspect-square rounded-2xl text-2xl grid place-items-center ${avatar === a ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold mb-2 px-1">{t.pickColor}</legend>
                <div className="flex gap-2 flex-wrap items-center">
                  {memberColors.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      aria-pressed={color === c}
                      aria-label={`Couleur ${c}`}
                      className={`press size-11 rounded-full ${color === c ? 'ring-4 ring-ink/70 ring-offset-2 ring-offset-bg' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                  <span className="ml-auto">
                    <Avatar emoji={avatar} color={color} size={52} label="Aperçu" />
                  </span>
                </div>
              </fieldset>
            </>
          )}

          {step === 'create' && <Field label={t.dueDate} hint={t.dueDateHint} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}

          {error && (
            <p role="alert" className="rounded-2xl bg-danger/10 text-danger font-semibold px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" size="xl" block loading={busy}>
            {step === 'create' ? t.createCta : step === 'join' ? t.joinCta : t.recoverCta}
          </Button>
        </form>
      )}

      {step === 'codes' && result && (
        <div className="flex-1 flex flex-col gap-6 py-6">
          {result.invite_code && (
            <section className="flex flex-col items-center text-center gap-3 animate-pop">
              <Biboun mood="wow" size={110} />
              <h1 className="text-3xl font-semibold">{t.inviteTitle}</h1>
              <p className="text-ink-soft">{t.inviteText}</p>
              <p className="font-display text-5xl tracking-[0.2em] font-semibold text-primary select-all" aria-label={`Code : ${result.invite_code.split('').join(' ')}`}>
                {result.invite_code}
              </p>
              <Button variant="soft" icon={<Share2 size={20} />} onClick={() => share(result.invite_code!)}>
                {t.share}
              </Button>
            </section>
          )}
          <section className="rounded-[var(--radius-blob)] bg-surface-2 p-5 flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{t.recoveryTitle}</h2>
            <p className="text-ink-soft text-sm">{t.recoveryText}</p>
            <button
              onClick={() => copy(result.recovery_code!)}
              className="press font-display text-xl tracking-wider bg-surface rounded-2xl py-3 flex items-center justify-center gap-2"
              aria-label="Copier le code de secours"
            >
              {result.recovery_code} <Copy size={18} aria-hidden />
            </button>
            {copied && <p className="text-center text-sm font-bold text-primary">{t.recoveryCopied}</p>}
          </section>
          <Button size="xl" block onClick={() => enter(result, dueDate ? { due_date: dueDate } : undefined)}>
            {t.recoveryDone}
          </Button>
        </div>
      )}
    </main>
  )
}

function ChoiceButton({ icon, title, hint, onClick, primary }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`press flex items-center gap-4 text-left rounded-[var(--radius-blob)] p-4 min-h-20 ${primary ? 'bg-primary text-primary-ink shadow-soft' : 'bg-surface shadow-soft'}`}
    >
      <span className={`size-12 shrink-0 rounded-2xl grid place-items-center ${primary ? 'bg-white/20' : 'bg-primary-soft text-primary'}`}>{icon}</span>
      <span>
        <span className="block font-bold text-lg">{title}</span>
        <span className={`block text-sm ${primary ? 'opacity-90' : 'text-ink-soft'}`}>{hint}</span>
      </span>
    </button>
  )
}
