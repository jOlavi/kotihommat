import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { ChoreDialog, Chore, ChoreFormData, ChoreType } from '@/pages/parent/ChoreDialog'

export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_SHORTS: Record<DayKey, string> = {
  ma: 'Ma', ti: 'Ti', ke: 'Ke', to: 'To', pe: 'Pe', la: 'La', su: 'Su',
}
const TYPE_LABELS: Record<ChoreType, string> = {
  paivittainen: 'Päivittäin',
  viikoittainen: 'Viikoittain',
  kertaluontoinen: 'Kerran',
}

export interface WeekAssignment {
  choreId: string
  days: Record<DayKey, string>
  all: string
}

interface Props {
  childNames: string[]
  chores: Chore[]
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>
  weeklyPlans: Record<string, WeekAssignment[]>
  setWeekPlans: React.Dispatch<React.SetStateAction<Record<string, WeekAssignment[]>>>
}

function emptyDays(): Record<DayKey, string> {
  return { ma: '', ti: '', ke: '', to: '', pe: '', la: '', su: '' }
}

function getWeekDate(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  return d
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekId(offset: number): string {
  const d = getWeekDate(offset)
  return `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function ChoresView({ childNames, chores, setChores, weeklyPlans, setWeekPlans }: Props) {
  const [view, setView] = useState<'lista' | 'suunnittelu'>('lista')
  const [weekOffset, setWeekOffset] = useState(0)
  const [plannerDraft, setPlannerDraft] = useState<WeekAssignment[]>([])
  const [plannerSaved, setPlannerSaved] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const saved = weeklyPlans[getWeekId(weekOffset)]
    const plannerChores = chores.filter(c => c.type !== 'kertaluontoinen')
    setPlannerDraft(
      plannerChores.map(c => {
        const existing = saved?.find(a => a.choreId === c.id)
        return existing ?? { choreId: c.id, days: emptyDays(), all: '' }
      })
    )
  }, [weekOffset])

  const handleSave = (data: ChoreFormData) => {
    if (editingChore) {
      setChores(prev => prev.map(c => c.id === editingChore.id ? { ...c, ...data } : c))
    } else {
      setChores(prev => [...prev, { ...data, id: crypto.randomUUID() }])
    }
    setDialogOpen(false)
    setEditingChore(null)
  }

  const handleDelete = (id: string) => {
    setChores(prev => prev.filter(c => c.id !== id))
  }

  const openAdd = () => { setEditingChore(null); setDialogOpen(true) }
  const openEdit = (chore: Chore) => { setEditingChore(chore); setDialogOpen(true) }

  const updateDay = (choreId: string, day: DayKey, name: string) =>
    setPlannerDraft(prev => prev.map(a =>
      a.choreId === choreId ? { ...a, days: { ...a.days, [day]: name } } : a
    ))

  const updateAll = (choreId: string, name: string) =>
    setPlannerDraft(prev => prev.map(a =>
      a.choreId === choreId ? { ...a, all: name } : a
    ))

  const handleSavePlan = () => {
    setWeekPlans(prev => ({ ...prev, [getWeekId(weekOffset)]: plannerDraft }))
    setPlannerSaved(true)
    setTimeout(() => setPlannerSaved(false), 1500)
  }

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ margin: 0 }}>Kotityöt</h2>
        {view === 'lista' && (
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Lisää
          </button>
        )}
      </div>

      <div className="seg" style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
          <input type="radio" name="choresview" checked={view === 'lista'} onChange={() => setView('lista')} />
          Lista
        </label>
        <label className="seg-opt" style={{ flex: 1, justifyContent: 'center' }}>
          <input type="radio" name="choresview" checked={view === 'suunnittelu'} onChange={() => setView('suunnittelu')} />
          Viikkosuunnittelu
        </label>
      </div>

      {view === 'lista' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {chores.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{c.name}</div>
                  <div className="card-meta" style={{ marginTop: 4 }}>
                    <span className="tag tag-outline">{TYPE_LABELS[c.type]}</span>
                    <span>
                      {c.assignedChildNames.length > 0
                        ? c.assignedChildNames.join(', ')
                        : 'Ei kohdistettu'}
                    </span>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)' }}>
                  {formatPrice(c.priceCents)} €
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openEdit(c)}>
                  <Pencil size={13} /> Muokkaa
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--color-accent-800)' }} onClick={() => handleDelete(c.id)}>
                  <Trash2 size={13} /> Poista
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'suunnittelu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={15} />
            </button>
            <h5 style={{ margin: 0, fontSize: 15 }}>
              Suunnittele Viikko {getISOWeek(getWeekDate(weekOffset))}
            </h5>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)' }}>
            Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {chores.filter(c => c.type !== 'kertaluontoinen').map(c => {
              const assignment = plannerDraft.find(a => a.choreId === c.id)
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div className="card-title">{c.name}</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)', fontSize: 13 }}>
                      {formatPrice(c.priceCents)} €
                    </span>
                  </div>

                  {c.type === 'paivittainen' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {DAY_KEYS.map(day => (
                        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '9.5px', opacity: 0.55 }}>{DAY_SHORTS[day]}</span>
                          <select
                            className="input"
                            style={{ padding: '3px 2px', fontSize: '10.5px', minHeight: 'auto', textAlign: 'center' }}
                            value={assignment?.days[day] ?? ''}
                            onChange={e => updateDay(c.id, day, e.target.value)}
                          >
                            <option value="">–</option>
                            {childNames.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.type === 'viikoittainen' && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Vastuuhenkilö tällä viikolla</label>
                      <select
                        className="input"
                        value={assignment?.all ?? ''}
                        onChange={e => updateAll(c.id, e.target.value)}
                      >
                        <option value="">–</option>
                        {childNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={handleSavePlan}
          >
            {plannerSaved ? 'Tallennettu!' : 'Tallenna viikkosuunnitelma'}
          </button>
        </>
      )}

      {dialogOpen && (
        <ChoreDialog
          chore={editingChore}
          childNames={childNames}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditingChore(null) }}
        />
      )}
    </div>
  )
}
