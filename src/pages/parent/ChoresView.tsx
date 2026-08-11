import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChoreDialog, ChoreFormData } from '@/pages/parent/ChoreDialog'
import { Chore, Assignment, DayKey, Member } from '@/types'

const DAY_KEYS: DayKey[] = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']
const DAY_SHORTS: Record<DayKey, string> = {
  ma: 'Ma', ti: 'Ti', ke: 'Ke', to: 'To', pe: 'Pe', la: 'La', su: 'Su',
}
const TYPE_LABELS: Record<string, string> = {
  daily: 'Päivittäin',
  weekly: 'Viikoittain',
  once: 'Kerran',
}

interface PlannerEntry {
  choreId: string
  assignment: Assignment
}

interface Props {
  familyId: string
  firestoreMembers: Member[]
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekId(offsetWeeks: number): string {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  return `${ref.getFullYear()}-W${String(getISOWeek(ref)).padStart(2, '0')}`
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

export function ChoresView({ familyId, firestoreMembers }: Props) {
  const [view, setView] = useState<'lista' | 'suunnittelu'>('lista')
  const [weekOffset, setWeekOffset] = useState(0)
  const [chores, setChores] = useState<Chore[]>([])
  const [choresLoading, setChoresLoading] = useState(true)
  const [savedAssignments, setSavedAssignments] = useState<Record<string, Assignment>>({})
  const [plannerDraft, setPlannerDraft] = useState<PlannerEntry[]>([])
  const [plannerSaved, setPlannerSaved] = useState(false)
  const [plannerError, setPlannerError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [choreError, setChoreError] = useState('')

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))
      setChoresLoading(false)
    })
  }, [familyId])

  useEffect(() => {
    const weekId = getWeekId(weekOffset)
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setSavedAssignments(loaded)
      }
    )
  }, [familyId, weekOffset])

  useEffect(() => {
    setPlannerDraft(
      chores.filter(c => c.type !== 'once').map(c => ({
        choreId: c.id,
        assignment: savedAssignments[c.id] ?? {},
      }))
    )
  }, [chores, savedAssignments])

  const childMembers = firestoreMembers.filter(m => m.role === 'child')
  const memberName = (uid: string) => firestoreMembers.find(m => m.uid === uid)?.firstName ?? '–'

  const handleSave = async (data: ChoreFormData) => {
    setChoreError('')
    try {
      if (editingChore) {
        await updateDoc(doc(db, `families/${familyId}/chores/${editingChore.id}`), {
          name: data.name,
          priceCents: data.priceCents,
          type: data.type,
          assignedMemberIds: data.assignedMemberIds,
        })
      } else {
        const ref = doc(collection(db, `families/${familyId}/chores`))
        await setDoc(ref, {
          name: data.name,
          priceCents: data.priceCents,
          type: data.type,
          assignedMemberIds: data.assignedMemberIds,
          active: true,
        })
      }
      setDialogOpen(false)
      setEditingChore(null)
    } catch {
      setChoreError('Tallennus epäonnistui')
    }
  }

  const handleDelete = async (id: string) => {
    setChoreError('')
    try {
      await deleteDoc(doc(db, `families/${familyId}/chores/${id}`))
    } catch {
      setChoreError('Poisto epäonnistui')
    }
  }

  const openAdd = () => { setEditingChore(null); setDialogOpen(true) }
  const openEdit = (chore: Chore) => { setEditingChore(chore); setDialogOpen(true) }

  const updateDay = (choreId: string, day: DayKey, uid: string) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, [day]: uid } } : e
    ))

  const updateAll = (choreId: string, uid: string) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, all: uid } } : e
    ))

  const handleSavePlan = async () => {
    setPlannerError('')
    const weekId = getWeekId(weekOffset)
    try {
      await Promise.all(
        plannerDraft.map(({ choreId, assignment }) =>
          setDoc(
            doc(db, `families/${familyId}/weeklyPlans/${weekId}/assignments/${choreId}`),
            assignment,
            { merge: true }
          )
        )
      )
      setPlannerSaved(true)
      setTimeout(() => setPlannerSaved(false), 1500)
    } catch {
      setPlannerError('Tallennus epäonnistui')
    }
  }

  const currentWeekNum = getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); return d })())

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
          {choresLoading ? (
            <p style={{ fontSize: 12, opacity: 0.5 }}>Ladataan...</p>
          ) : chores.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title">{c.name}</div>
                  <div className="card-meta" style={{ marginTop: 4 }}>
                    <span className="tag tag-outline">{TYPE_LABELS[c.type]}</span>
                    <span>
                      {c.assignedMemberIds.length > 0
                        ? c.assignedMemberIds.map(memberName).join(', ')
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
          {choreError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 0 }}>{choreError}</p>}
        </div>
      )}

      {view === 'suunnittelu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Edellinen viikko" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={15} />
            </button>
            <h5 style={{ margin: 0, fontSize: 15 }}>Suunnittele Viikko {currentWeekNum}</h5>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Seuraava viikko" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-4)' }}>
            Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {chores.filter(c => c.type !== 'once').map(c => {
              const entry = plannerDraft.find(e => e.choreId === c.id)
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div className="card-title">{c.name}</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)', fontSize: 13 }}>
                      {formatPrice(c.priceCents)} €
                    </span>
                  </div>

                  {c.type === 'daily' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {DAY_KEYS.map(day => (
                        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: '9.5px', opacity: 0.55 }}>{DAY_SHORTS[day]}</span>
                          <select
                            className="input"
                            style={{ padding: '3px 2px', fontSize: '10.5px', minHeight: 'auto', textAlign: 'center' }}
                            value={entry?.assignment[day] ?? ''}
                            onChange={e => updateDay(c.id, day, e.target.value)}
                          >
                            <option value="">–</option>
                            {childMembers.map(m => <option key={m.uid} value={m.uid}>{m.firstName}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {c.type === 'weekly' && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Vastuuhenkilö tällä viikolla</label>
                      <select
                        className="input"
                        value={entry?.assignment.all ?? ''}
                        onChange={e => updateAll(c.id, e.target.value)}
                      >
                        <option value="">–</option>
                        {childMembers.map(m => <option key={m.uid} value={m.uid}>{m.firstName}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plannerError && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 25)', margin: 'var(--space-2) 0 0' }}>{plannerError}</p>}

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
          firestoreMembers={childMembers}
          onSave={handleSave}
          onClose={() => { setDialogOpen(false); setEditingChore(null) }}
        />
      )}
    </div>
  )
}
