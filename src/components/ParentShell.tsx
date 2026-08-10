import { useState, useEffect } from "react";
import {
  ListChecks,
  Calendar,
  Users,
  UserCircle,
  Wallet,
  Settings,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FamilyView } from "@/pages/parent/FamilyView";
import { ChoresView, WeekAssignment } from "@/pages/parent/ChoresView";
import { WeekView } from "@/pages/parent/WeekView";
import {
  ProfileView,
  ChildProfile,
  makeDefaultProfile,
} from "@/pages/parent/ProfileView";
import { PayView } from "@/pages/parent/PayView";
import { Chore } from "@/pages/parent/ChoreDialog";

interface FirestoreMember {
  uid: string
  firstName: string
  role: 'parent' | 'child'
  username?: string
  pin?: string
}

const INITIAL_CHORES: Chore[] = [
  { id: "c1", name: "Astianpesukoneen tyhjennys", priceCents: 50, type: "paivittainen", assignedChildNames: [] },
  { id: "c2", name: "Koiran ulkoilutus", priceCents: 100, type: "paivittainen", assignedChildNames: [] },
  { id: "c3", name: "Roskat ulos", priceCents: 50, type: "viikoittainen", assignedChildNames: [] },
];

interface Props {
  familyId: string
  creatorName: string
  onSignOut: () => void
}

type Tab = "chores" | "viikko" | "family" | "lapset" | "maksut";

export function ParentShell({ familyId, creatorName, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("chores");
  const [chores, setChores] = useState<Chore[]>(INITIAL_CHORES);
  const [weeklyPlans, setWeekPlans] = useState<Record<string, WeekAssignment[]>>({});
  const [profileChildId, setProfileChildId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>({});
  const [firestoreMembers, setFirestoreMembers] = useState<FirestoreMember[]>([]);

  useEffect(() => {
    const q = collection(db, `families/${familyId}/members`);
    return onSnapshot(q, (snap) => {
      const members = snap.docs.map(d => ({ uid: d.id, ...d.data() } as FirestoreMember));
      setFirestoreMembers(members);
      // Initialise profiles for any new child members
      setProfiles(prev => {
        const next = { ...prev };
        members.filter(m => m.role === 'child').forEach(m => {
          if (!next[m.firstName]) next[m.firstName] = makeDefaultProfile();
        });
        return next;
      });
    });
  }, [familyId]);

  const updateProfile = (name: string, fn: (p: ChildProfile) => ChildProfile) =>
    setProfiles((prev) => ({
      ...prev,
      [name]: fn(prev[name] ?? makeDefaultProfile()),
    }));

  const childNames = firestoreMembers
    .filter(m => m.role === 'child')
    .map(m => m.firstName);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chores", label: "Kotityöt", icon: <ListChecks size={20} /> },
    { id: "viikko", label: "Viikko", icon: <Calendar size={20} /> },
    { id: "family", label: "Perhe", icon: <Users size={20} /> },
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
        <button
          type="button"
          className="tag tag-accent"
          style={{
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 15,
          }}
          onClick={onSignOut}
        >
          {creatorName}
        </button>
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
        >
          <Settings size={18} />
        </button>
      </header>

      <main style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "chores" && (
          <ChoresView
            childNames={childNames}
            chores={chores}
            setChores={setChores}
            weeklyPlans={weeklyPlans}
            setWeekPlans={setWeekPlans}
          />
        )}
        {activeTab === "viikko" && (
          <WeekView
            childNames={childNames}
            chores={chores}
            weeklyPlans={weeklyPlans}
            onChildClick={(name) => {
              setProfileChildId(name);
              setActiveTab("lapset");
            }}
          />
        )}
        {activeTab === "family" && (
          <FamilyView
            familyId={familyId}
            members={firestoreMembers}
          />
        )}
        {activeTab === "lapset" && (
          <ProfileView
            childNames={childNames}
            initialChild={profileChildId}
            profiles={profiles}
            updateProfile={updateProfile}
            chores={chores}
            weeklyPlans={weeklyPlans}
          />
        )}
        {activeTab === "maksut" && (
          <PayView
            childNames={childNames}
            profiles={profiles}
            updateProfile={updateProfile}
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
    </div>
  );
}
