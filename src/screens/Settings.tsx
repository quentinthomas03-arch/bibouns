import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { Segmented } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/app/session'
import { useMembers } from '@/app/members'
import { usePhase } from '@/app/phase'
import { useTextSize, useTheme, type TextSize, type ThemePref } from '@/app/theme'
import { useRows, useStore } from '@/sync/store'
import type { BaseRow } from '@/sync/tables'
import { supabase } from '@/lib/supabase'
import { BabySettings } from '@/components/settings/BabySettings'
import { ShortcutSettings } from '@/components/settings/ShortcutSettings'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { CalendarSettings } from '@/components/settings/CalendarSettings'
import { avatars, memberColors, onboarding as to, settings as t, sync as tsync } from '@/content/fr'

export function Settings() {
  const { me, partner } = useMembers()
  const { setSetting, patch, db, engine } = useStore()
  const { dueDate } = usePhase()
  const { signOut, sync } = useSession()
  const [theme, setTheme] = useTheme()
  const [textSize, setTextSize] = useTextSize()
  const toast = useToast()
  const [name, setName] = useState('')
  const [due, setDue] = useState('')
  const [recovery, setRecovery] = useState<string | null>(null)
  const households = useRows<BaseRow & { invite_code?: string | null; name: string }>('households') ?? []
  const household = households[0]
  const setAside = useLiveQuery(() => db.deadletter.count(), [db]) ?? 0

  useEffect(() => setName(me?.first_name ?? ''), [me?.first_name])
  useEffect(() => setDue(dueDate ?? ''), [dueDate])

  const updateMe = async (p: Record<string, unknown>) => {
    if (!me) return
    await patch('members', me.id, p)
    toast(t.saved)
  }

  async function callRpc(fn: 'regenerate_recovery_code' | 'regenerate_invite_code') {
    if (!supabase) return null
    const { data, error } = await supabase.rpc(fn)
    if (error || !data?.ok) {
      toast('Impossible pour le moment (réseau ?)')
      return null
    }
    return data as { recovery_code?: string; invite_code?: string }
  }

  return (
    <div className="px-4 pt-safe pb-tabbar max-w-lg mx-auto">
      <header className="flex items-center gap-2 pt-2">
        <Link to="/" aria-label="Retour" className="press size-11 grid place-items-center rounded-full bg-surface shadow-soft">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-3xl font-semibold">{t.title}</h1>
      </header>

      <SectionTitle>{t.profile}</SectionTitle>
      {me && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <Avatar emoji={me.avatar} color={me.color} size={56} />
            <Field
              label="Prénom"
              className="flex-1"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== me.first_name && updateMe({ first_name: name.trim() })}
            />
          </div>
          <div className="grid grid-cols-8 gap-2" role="group" aria-label="Avatar">
            {avatars.map((a) => (
              <button key={a} aria-pressed={me.avatar === a} aria-label={`Avatar ${a}`} onClick={() => updateMe({ avatar: a })} className={`press aspect-square rounded-2xl text-2xl grid place-items-center ${me.avatar === a ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2'}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Couleur">
            {memberColors.map((c) => (
              <button key={c} aria-pressed={me.color === c} aria-label={`Couleur ${c}`} onClick={() => updateMe({ color: c })} className={`press size-11 rounded-full ${me.color === c ? 'ring-4 ring-ink/70 ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />
            ))}
          </div>
        </Card>
      )}

      <SectionTitle>{t.household}</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="font-bold">{household?.name ?? 'Notre foyer'}</p>
        <ul className="flex flex-col gap-2">
          {[me, partner].filter(Boolean).map((m) => (
            <li key={m!.id} className="flex items-center gap-3">
              <Avatar emoji={m!.avatar} color={m!.color} size={36} />
              <span className="font-semibold">{m!.first_name}</span>
              {m === me && <span className="text-sm text-ink-soft">(moi)</span>}
            </li>
          ))}
        </ul>
        {!partner && (
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="text-sm text-ink-soft">{t.waitingPartner}</p>
            {household?.invite_code && <p className="font-display text-3xl tracking-[0.2em] text-primary">{household.invite_code}</p>}
            <Button variant="soft" size="md" className="mt-2" onClick={async () => (await callRpc('regenerate_invite_code')) && toast(t.saved)}>
              {t.newInvite}
            </Button>
          </div>
        )}
      </Card>

      <SectionTitle>{t.pregnancy}</SectionTitle>
      <Card>
        <Field label={to.dueDate} type="date" value={due} onChange={(e) => setDue(e.target.value)} onBlur={() => due && due !== dueDate && setSetting('due_date', due).then(() => toast(t.saved))} hint={to.dueDateHint} />
      </Card>

      <NotificationSettings />
      <CalendarSettings />
      <BabySettings />
      <ShortcutSettings />

      <SectionTitle>{t.appearance}</SectionTitle>
      <Segmented<ThemePref>
        label={t.appearance}
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'auto', label: t.themeAuto },
          { value: 'hour', label: '🕘 Heure' },
          { value: 'light', label: t.themeLight },
          { value: 'dark', label: t.themeDark },
        ]}
      />
      <p className="text-xs text-ink-soft px-1 mt-1">Auto : suit l’iPhone · Heure : veilleuse de 21 h à 7 h · réglage propre à ce téléphone.</p>
      <div className="mt-3">
        <Segmented<TextSize>
          label="Taille du texte"
          value={textSize}
          onChange={setTextSize}
          options={[
            { value: 'normal', label: 'A' },
            { value: 'large', label: 'A+' },
            { value: 'xlarge', label: 'A++' },
          ]}
        />
        <p className="text-xs text-ink-soft px-1 mt-1">Taille du texte sur ce téléphone.</p>
      </div>

      <SectionTitle>{t.security}</SectionTitle>
      <Card className="flex flex-col gap-3">
        {recovery ? (
          <button onClick={() => navigator.clipboard?.writeText(recovery).then(() => toast(to.recoveryCopied))} className="press font-display text-xl tracking-wider bg-surface-2 rounded-2xl py-3 flex items-center justify-center gap-2">
            {recovery} <Copy size={18} aria-hidden />
          </button>
        ) : (
          <p className="text-sm text-ink-soft">{to.recoveryText}</p>
        )}
        <Button
          variant="outline"
          size="md"
          onClick={async () => {
            if (!confirm(t.newRecoveryConfirm)) return
            const r = await callRpc('regenerate_recovery_code')
            if (r?.recovery_code) setRecovery(r.recovery_code)
          }}
        >
          {t.newRecovery}
        </Button>
      </Card>

      <SectionTitle>{t.syncTitle}</SectionTitle>
      <Card className="flex flex-col gap-2">
        <p>
          {sync ? tsync[sync.state] : '…'}
          {sync?.pending ? ` · ${tsync.pending(sync.pending)}` : ''}
        </p>
        {sync?.lastSyncAt && <p className="text-sm text-ink-soft">Dernière synchro : {new Date(sync.lastSyncAt).toLocaleString('fr-FR')}</p>}
        {sync?.lastError && sync.state !== 'idle' && <p className="text-sm text-danger break-words">{sync.lastError}</p>}
        {setAside > 0 && <p className="text-sm text-danger">{t.setAside(setAside)}</p>}
        <Button variant="soft" size="md" onClick={() => engine.syncNow().then(() => toast(t.saved))}>
          {t.syncNow}
        </Button>
      </Card>

      <SectionTitle>Sauvegarde & données</SectionTitle>
      <Link to="/sauvegarde" className="press block">
        <Card className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            💾
          </span>
          <span className="flex-1">
            <span className="block font-bold">Exporter, livre PDF, supprimer</span>
            <span className="block text-sm text-ink-soft">ZIP des données et des photos, livre de naissance, effacement</span>
          </span>
        </Card>
      </Link>

      <SectionTitle>{t.about}</SectionTitle>
      <Card className="flex flex-col gap-2 text-sm text-ink-soft">
        <p>{t.privacy}</p>
        <p>Version {__APP_VERSION__}</p>
      </Card>

      <div className="mt-8">
        <Button variant="danger" block onClick={() => confirm(t.signOutConfirm) && signOut()}>
          {t.signOut}
        </Button>
      </div>
    </div>
  )
}
