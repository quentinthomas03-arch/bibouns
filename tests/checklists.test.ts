import { describe, expect, it } from 'vitest'
import { CHECKLIST_TEMPLATES, between, euros, listStats, templateRows } from '../src/lib/checklists'
import { MILESTONES } from '../src/content/milestones'

const idFor = (...p: string[]) => `H:${p.join(':')}`

describe('modèles de checklists', () => {
  it('ids déterministes : deux téléphones produisent les mêmes lignes', () => {
    const a = templateRows(CHECKLIST_TEMPLATES[0], idFor, '2027-05-04', 0)
    const b = templateRows(CHECKLIST_TEMPLATES[0], idFor, '2027-05-04', 0)
    expect(a).toEqual(b)
    expect(new Set(a.items.map((i) => i.id)).size).toBe(a.items.length)
  })
  it('échéances liées au calendrier', () => {
    const d = templateRows(CHECKLIST_TEMPLATES.find((t) => t.key === 'demarches')!, idFor, '2027-05-04', 0)
    const decl = d.items.find((i) => i.label.startsWith('Déclaration de naissance'))!
    expect(decl.due_date).toBe('2027-05-09') // 5 jours après la date prévue (naissance pas encore saisie)
  })
  it('toutes les échéances référencées existent', () => {
    const ids = new Set(MILESTONES.map((m) => m.id))
    for (const t of CHECKLIST_TEMPLATES) for (const [, , m] of t.items) if (m) expect(ids.has(m), m).toBe(true)
  })
  it('budget en centimes', () => {
    const a = templateRows(CHECKLIST_TEMPLATES.find((t) => t.key === 'achats')!, idFor, null, 0)
    expect(a.items[0].budget_cents).toBe(45000)
    expect(a.items[0].due_date).toBeNull()
  })
})

describe('statistiques', () => {
  it('progression et budget restant', () => {
    const s = listStats([
      { done: true, budget_cents: 1000 },
      { done: false, budget_cents: 2550 },
      { done: false, budget_cents: null },
    ])
    expect(s).toEqual({ total: 3, done: 1, budget: 3550, remaining: 2550, progress: 1 / 3 })
  })
  it('format euros', () => {
    expect(euros(45000).replace(/\s/g, ' ')).toBe('450 €')
    expect(euros(2550).replace(/\s/g, ' ')).toBe('25,50 €')
  })
  it('position entre deux voisins', () => {
    expect(between(1, 2)).toBe(1.5)
    expect(between(undefined, 2)).toBe(1)
    expect(between(3, undefined)).toBe(4)
  })
})

import { myTasks } from '../src/lib/checklists'
describe('mes tâches (accueil)', () => {
  const items = [
    { id: '1', done: false, assignee: 'q', due_date: '2027-01-20' },
    { id: '2', done: false, assignee: 'q', due_date: null },
    { id: '3', done: true, assignee: 'q', due_date: '2027-01-02' },
    { id: '4', done: false, assignee: 'a', due_date: '2027-01-02' },
    { id: '5', done: false, assignee: null, due_date: '2027-01-03' },
    { id: '6', done: false, assignee: null, due_date: '2027-01-30' },
    { id: '7', done: false, assignee: 'q', due_date: '2026-12-28' },
  ]
  it('mes tâches + les urgentes sans responsable, par échéance (retards en premier)', () => {
    expect(myTasks(items, 'q', '2027-01-01').map((i) => i.id)).toEqual(['7', '5', '1', '2'])
  })
  it('limite', () => expect(myTasks(items, 'q', '2027-01-01', 2).map((i) => i.id)).toEqual(['7', '5']))
})
