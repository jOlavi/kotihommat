import { useState, useEffect } from "react";
import {
  Home,
  ListChecks,
  Calendar,
  UserCircle,
  Wallet,
  Settings,
} from "lucide-react";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FamilyView } from "@/pages/parent/FamilyView";
import { ChoresView } from "@/pages/parent/ChoresView";
import { WeekView } from "@/pages/parent/WeekView";
import { ProfileView } from "@/pages/parent/ProfileView";
import { PayView } from "@/pages/parent/PayView";
import { TodayView } from "@/pages/child/TodayView";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Assignment, Chore, Member, TaskInstance } from "@/types"

function getCurrentWeekId(): string {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}


interface Props {
  familyId: string
  uid: string
  onSignOut: () => void
}

type Tab = "today" | "chores" | "viikko" | "lapset" | "maksut" | "family";

export function ParentShell({ familyId, uid, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekId, setWeekId] = useState(() => getCurrentWeekId());
  const [chores, setChores] = useState<Chore[]>([]);
  const [firestoreMembers, setFirestoreMembers] = useState<Member[]>([]);
  const [familyCode, setFamilyCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allFamilyInstances, setAllFamilyInstances] = useState<TaskInstance[]>([])
  const [weekAssignments, setWeekAssignments] = useState<Record<string, Assignment>>({})

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        setToday(new Date().toISOString().slice(0, 10))
        setWeekId(getCurrentWeekId())
      }
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  useEffect(() => {
    return onSnapshot(doc(db, `families/${familyId}`), snap => {
      setFamilyCode(snap.data()?.familyCode ?? '')
    })
  }, [familyId])

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)).filter(c => c.active !== false))
    })
  }, [familyId])

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/members`), (snap) => {
      const members = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Member));
      setFirestoreMembers(members);
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/taskInstances`),
      snap => setAllFamilyInstances(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance)))
    )
  }, [familyId])

  useEffect(() => {
    return onSnapshot(
      collection(db, `families/${familyId}/weeklyPlans/${weekId}/assignments`),
      snap => {
        const loaded: Record<string, Assignment> = {}
        snap.docs.forEach(d => { loaded[d.id] = d.data() as Assignment })
        setWeekAssignments(loaded)
      }
    )
  }, [familyId, weekId])

  const activeChoreIds = new Set(chores.map(c => c.id))
  const onceChores = chores.filter(c => c.type === 'once')
  const myInstances = allFamilyInstances.filter(t => t.memberId === uid)
  const todayTasks = myInstances.filter(t => t.date === today && activeChoreIds.has(t.choreId))

  const handleToggle = async (id: string) => {
    const instance = myInstances.find(t => t.id === id)
    if (!instance || instance.status === 'merkitty') return
    const newStatus = (instance.status ?? 'tekematon') === 'tehty' ? 'tekematon' : 'tehty'
    await updateDoc(doc(db, `families/${familyId}/taskInstances/${id}`), {
      status: newStatus,
      completedAt: newStatus === 'tehty' ? new Date().toISOString() : null,
    })
  }

  const handleClaim = async (choreId: string) => {
    const chore = chores.find(c => c.id === choreId)
    if (!chore) return
    await setDoc(doc(db, `families/${familyId}/weeklyPlans/${weekId}/assignments/${choreId}`), { all: uid })
    await setDoc(
      doc(db, `families/${familyId}/taskInstances/${choreId}_${uid}_${today}`),
      { choreId, choreName: chore.name, memberId: uid, date: today, isoWeek: weekId, priceCents: chore.priceCents, status: 'tekematon' },
      { merge: true }
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "today", label: "Tänään", icon: <Home size={20} /> },
    { id: "chores", label: "Kotityöt", icon: <ListChecks size={20} /> },
    { id: "viikko", label: "Viikko", icon: <Calendar size={20} /> },
    { id: "lapset", label: "Lapset", icon: <UserCircle size={20} /> },
    { id: "maksut", label: "Maksut", icon: <Wallet size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header
        className="nav"
        style={{
          padding: "var(--space-3) var(--space-4)",
          flex: "none",
          position: "relative",
        }}
      >
        <span
          className="tag tag-accent"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {firestoreMembers.find(m => m.uid === uid)?.firstName ?? '…'}
        </span>
        <span style={{
          fontFamily: '"Bodoni Moda", var(--font-heading)',
          fontWeight: 600,
          fontSize: 22,
          color: '#b68235',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>Kotihommat</span>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-label="Asetukset"
          style={{ marginLeft: "auto" }}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "today" && (
          <TodayView
            tasks={todayTasks}
            onToggle={handleToggle}
            absences={[]}
            today={today}
            onceChores={onceChores}
            weekAssignments={weekAssignments}
            uid={uid}
            onClaim={handleClaim}
          />
        )}
        {activeTab === "chores" && (
          <ChoresView
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "viikko" && (
          <WeekView
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "lapset" && (
          <ProfileView
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "maksut" && (
          <PayView
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "family" && (
          <FamilyView
            familyId={familyId}
            familyCode={familyCode}
            members={firestoreMembers}
            onBack={() => setActiveTab("chores")}
          />
        )}
      </main>

      <nav
        style={{
          display: "flex",
          borderTop: "1px solid var(--color-divider)",
          flex: "none",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "var(--space-2) 0 var(--space-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              color:
                activeTab === tab.id
                  ? "var(--color-accent)"
                  : "color-mix(in srgb, var(--color-text) 40%, transparent)",
              fontFamily: "var(--font-body)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {settingsOpen && (
        <SettingsDialog
          onSignOut={onSignOut}
          onClose={() => setSettingsOpen(false)}
          onOpenFamily={() => setActiveTab("family")}
        />
      )}
    </div>
  );
}
