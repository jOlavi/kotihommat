import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ChoreDialog, ChoreFormData } from '@/pages/parent/ChoreDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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

function getWeekDates(offsetWeeks: number): Array<{ date: string; dayKey: DayKey }> {
  const ref = new Date()
  ref.setDate(ref.getDate() + offsetWeeks * 7)
  const day = ref.getDay() || 7
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - day + 1)
  return DAY_KEYS.map((dayKey, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { date: d.toISOString().slice(0, 10), dayKey }
  })
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2 })
}

function shortName(name: string): string {
  return name.length > 5 ? name.slice(0, 5) + '…' : name
}

function normalizeAssignees(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val as string[]
  return [val as string]
}

function DayMultiSelect({ value, members, onChange }: {
  value: string[]
  members: Member[]
  onChange: (uids: string[]) => void
}) {
  const toggle = (uid: string) =>
    onChange(value.includes(uid) ? value.filter(u => u !== uid) : [...value, uid])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {members.map(m => {
        const selected = value.includes(m.uid)
        return (
          <button
            key={m.uid}
            type="button"
            className={`tag ${selected ? 'tag-accent' : 'tag-outline'}`}
            style={{ fontSize: '10.5px', padding: '3px 4px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
            onClick={() => toggle(m.uid)}
          >
            {shortName(m.firstName)}
          </button>
        )
      })}
    </div>
  )
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
  const [copyLoading, setCopyLoading] = useState(false)
  const [copiedFromWeek, setCopiedFromWeek] = useState<number | null>(null)
  const [confirmCopy, setConfirmCopy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [choreError, setChoreError] = useState('')
  const [deletePending, setDeletePending] = useState<Chore | null>(null)
  const [weekendChores, setWeekendChores] = useState<Set<string>>(new Set())

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
    const withWeekend = new Set<string>()
    chores.forEach(c => {
      const a = savedAssignments[c.id]
      if (a && (normalizeAssignees(a.la).length > 0 || normalizeAssignees(a.su).length > 0)) withWeekend.add(c.id)
    })
    setWeekendChores(withWeekend)
    setPlannerDraft(
      chores.filter(c => c.type !== 'once').map(c => {
        const saved = savedAssignments[c.id] ?? {}
        const normalized: Assignment = {}
        if (saved.all) normalized.all = saved.all
        DAY_KEYS.forEach(day => { normalized[day] = normalizeAssignees(saved[day]) })
        return { choreId: c.id, assignment: normalized }
      })
    )
  }, [chores, savedAssignments])

  const childMembers = firestoreMembers
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
        if (data.name !== editingChore.name) {
          const snap = await getDocs(query(
            collection(db, `families/${familyId}/taskInstances`),
            where('choreId', '==', editingChore.id)
          ))
          if (!snap.empty) {
            const batch = writeBatch(db)
            snap.docs.forEach(d => batch.update(d.ref, { choreName: data.name }))
            await batch.commit()
          }
        }
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
      await updateDoc(doc(db, `families/${familyId}/chores/${id}`), { active: false })
    } catch {
      setChoreError('Poisto epäonnistui')
    }
  }

  const openAdd = () => { setEditingChore(null); setDialogOpen(true) }
  const openEdit = (chore: Chore) => { setEditingChore(chore); setDialogOpen(true) }

  const updateDay = (choreId: string, day: DayKey, uids: string[]) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, [day]: uids } } : e
    ))

  const updateAll = (choreId: string, uid: string) =>
    setPlannerDraft(prev => prev.map(e =>
      e.choreId === choreId ? { ...e, assignment: { ...e.assignment, all: uid } } : e
    ))

  const toggleWeekend = (choreId: string, include: boolean) => {
    setWeekendChores(prev => {
      const next = new Set(prev)
      include ? next.add(choreId) : next.delete(choreId)
      return next
    })
    if (!include) {
      setPlannerDraft(prev => prev.map(e =>
        e.choreId === choreId
          ? { ...e, assignment: { ...e.assignment, la: [], su: [] } }
          : e
      ))
    }
  }

  const handleSavePlan = async () => {
    setPlannerError('')
    const weekId = getWeekId(weekOffset)
    const weekDates = getWeekDates(weekOffset)
    try {
      await Promise.all(
        plannerDraft.map(({ choreId, assignment }) => {
          const clean: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(assignment)) {
            if (v !== undefined) clean[k] = v
          }
          return setDoc(
            doc(db, `families/${familyId}/weeklyPlans/${weekId}/assignments/${choreId}`),
            clean
          )
        })
      )

      const batch = writeBatch(db)
      for (const { choreId, assignment } of plannerDraft) {
        const chore = chores.find(c => c.id === choreId)
        if (!chore) continue
        if (chore.type === 'daily') {
          for (const { date, dayKey } of weekDates) {
            const memberIds = normalizeAssignees(assignment[dayKey])
            for (const memberId of memberIds) {
              batch.set(
                doc(db, `families/${familyId}/taskInstances/${choreId}_${memberId}_${date}`),
                { choreId, choreName: chore.name, memberId, date, isoWeek: weekId, priceCents: chore.priceCents },
                { merge: true }
              )
            }
          }
        } else if (chore.type === 'weekly') {
          const memberId = assignment.all
          if (!memberId) continue
          const date = weekDates[0].date
          batch.set(
            doc(db, `families/${familyId}/taskInstances/${choreId}_${memberId}_${date}`),
            { choreId, choreName: chore.name, memberId, date, isoWeek: weekId, priceCents: chore.priceCents },
            { merge: true }
          )
        }
      }
      await batch.commit()

      setPlannerSaved(true)
      setTimeout(() => setPlannerSaved(false), 1500)
    } catch {
      setPlannerError('Tallennus epäonnistui')
    }
  }

  const handleCopyPrevWeek = async () => {
    setCopyLoading(true)
    setPlannerError('')
    try {
      const prevWeekId = getWeekId(weekOffset - 1)
      const prevWeekNum = getISOWeek((() => { const d = new Date(); d.setDate(d.getDate() + (weekOffset - 1) * 7); return d })())
      const snap = await getDocs(collection(db, `families/${familyId}/weeklyPlans/${prevWeekId}/assignments`))
      if (snap.empty) {
        setPlannerError('Edellisellä viikolla ei ole suunnitelmaa.')
        return
      }
      const loaded: Record<string, Assignment> = {}
      snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
      setPlannerDraft(prev => prev.map(e => ({
        ...e,
        assignment: loaded[e.choreId] ?? e.assignment,
      })))
      const withWeekend = new Set(weekendChores)
      snap.docs.forEach(d => {
        const a = d.data() as Assignment
        if (a.la || a.su) withWeekend.add(d.id)
      })
      setWeekendChores(withWeekend)
      setCopiedFromWeek(prevWeekNum)
    } catch {
      setPlannerError('Kopiointi epäonnistui')
    } finally {
      setCopyLoading(false)
    }
  }

  const handleClear = () => {
    setPlannerDraft(prev => prev.map(e => ({ ...e, assignment: {} })))
    setWeekendChores(new Set())
    setCopiedFromWeek(null)
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
          ) : chores.filter(c => c.active !== false).map(c => (
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
                <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--color-accent-800)' }} onClick={() => setDeletePending(c)}>
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
          <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 var(--space-2)' }}>
            Aseta kuka hoitaa minkäkin kotityön kunakin päivänä.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
              disabled={copyLoading}
              onClick={() => setConfirmCopy(true)}
            >
              {copyLoading ? 'Kopioidaan…' : copiedFromWeek ? `Kopioitu vko${copiedFromWeek}` : 'Kopioi ed. viikko'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={() => setConfirmClear(true)}
            >
              Tyhjennä
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {chores.filter(c => c.type !== 'once' && c.active !== false).map(c => {
              const entry = plannerDraft.find(e => e.choreId === c.id)
              const choreMembers = firestoreMembers.filter(m => c.assignedMemberIds.includes(m.uid))
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div className="card-title">{c.name}</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)', fontSize: 13 }}>
                      {formatPrice(c.priceCents)} €
                    </span>
                  </div>

                  {c.type === 'daily' && (() => {
                    const showWeekend = weekendChores.has(c.id)
                    const visibleDays = showWeekend ? DAY_KEYS : DAY_KEYS.slice(0, 5)
                    const cols = visibleDays.length
                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, marginBottom: 'var(--space-2)' }}>
                          {visibleDays.map(day => (
                            <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                              <span style={{ fontSize: '9.5px', opacity: 0.55 }}>{DAY_SHORTS[day]}</span>
                              <DayMultiSelect
                                value={normalizeAssignees(entry?.assignment[day])}
                                members={choreMembers}
                                onChange={uids => updateDay(c.id, day, uids)}
                              />
                            </div>
                          ))}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 11, opacity: 0.6, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={showWeekend}
                            onChange={e => toggleWeekend(c.id, e.target.checked)}
                            style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                          />
                          Sisällytä viikonloppu
                        </label>
                      </>
                    )
                  })()}

                  {c.type === 'weekly' && (
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Vastuuhenkilö tällä viikolla</label>
                      <select
                        className="input"
                        value={entry?.assignment.all ?? ''}
                        onChange={e => updateAll(c.id, e.target.value)}
                      >
                        <option value="">–</option>
                        {choreMembers.map(m => <option key={m.uid} value={m.uid}>{m.firstName}</option>)}
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

      {deletePending && (
        <ConfirmDialog
          title="Poista kotityö"
          message={`Poistetaanko "${deletePending.name}"? Kotityö häviää listalta.`}
          confirmLabel="Poista"
          onConfirm={() => { handleDelete(deletePending.id); setDeletePending(null) }}
          onClose={() => setDeletePending(null)}
        />
      )}

      {confirmCopy && (
        <ConfirmDialog
          title="Kopioi edellinen viikko"
          message="Edellisen viikon suunnitelma kopioidaan tälle viikolle. Nykyiset valinnat ylikirjoitetaan."
          confirmLabel="Kopioi"
          onConfirm={() => { setConfirmCopy(false); handleCopyPrevWeek() }}
          onClose={() => setConfirmCopy(false)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Tyhjennä suunnitelma"
          message="Kaikki tämän viikon valinnat poistetaan. Muutos astuu voimaan vasta tallennuksen jälkeen."
          confirmLabel="Tyhjennä"
          onConfirm={() => { handleClear(); setConfirmClear(false) }}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
