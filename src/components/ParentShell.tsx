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
import { ChoresView } from "@/pages/parent/ChoresView";
import { WeekView } from "@/pages/parent/WeekView";
import {
  ProfileView,
  ChildProfile,
  makeDefaultProfile,
} from "@/pages/parent/ProfileView";
import { PayView } from "@/pages/parent/PayView";
import { Chore, Member } from "@/types"

interface Props {
  familyId: string
  creatorName: string
  onSignOut: () => void
}

type Tab = "chores" | "viikko" | "family" | "lapset" | "maksut";

export function ParentShell({ familyId, creatorName, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("chores");
  const [chores, setChores] = useState<Chore[]>([]);
  const [profileChildId, setProfileChildId] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ChildProfile>>({});
  const [firestoreMembers, setFirestoreMembers] = useState<Member[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/chores`), snap => {
      setChores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)))
    })
  }, [familyId])

  useEffect(() => {
    return onSnapshot(collection(db, `families/${familyId}/members`), (snap) => {
      const members = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Member));
      setFirestoreMembers(members);
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
            familyId={familyId}
            firestoreMembers={firestoreMembers}
          />
        )}
        {activeTab === "viikko" && (
          <WeekView
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
            onChildClick={(uid) => {
              setProfileChildId(uid);
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
            initialChild={profileChildId}
            profiles={profiles}
            updateProfile={updateProfile}
            chores={chores}
            familyId={familyId}
            firestoreMembers={firestoreMembers}
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
