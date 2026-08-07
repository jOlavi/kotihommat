export type Role = 'parent' | 'child'

export type ChoreType = 'daily' | 'weekly' | 'once'

export type TaskStatus = 'tekematon' | 'tehty' | 'merkitty'

export type AbsenceType = 'loma' | 'sairas'

export interface Member {
  uid: string
  role: Role
  firstName: string
  username?: string // child only
  familyId: string
  paidTotal?: number // denormalized cents
}

export interface Family {
  id: string
  name: string
  createdAt: Date
  inviteCode?: string
}

export interface Chore {
  id: string
  name: string
  priceCents: number // multiples of 50
  type: ChoreType
  assignedMemberIds: string[]
  active: boolean
}

export type DayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe' | 'la' | 'su'

// daily: { ma: memberId, ti: memberId, ... }  weekly: { all: memberId }
export type Assignment = Partial<Record<DayKey, string>> & { all?: string }

export interface WeeklyPlan {
  weekId: string // e.g. "2024-W38"
  assignments: Record<string, Assignment> // choreId → Assignment
}

export interface TaskInstance {
  id: string
  choreId: string
  memberId: string
  date: string // ISO date, Europe/Helsinki
  isoWeek: number
  priceCents: number
  status: TaskStatus
  completedAt: Date | null
}

export interface Absence {
  id: string
  type: AbsenceType
  from: string // ISO date
  to: string   // ISO date
}

export interface Payment {
  id: string
  amount: number // cents
  date: Date
}

export interface ChildProfile {
  member: Member
  earnedTotal: number  // cents
  paidTotal: number    // cents
  outstanding: number  // cents = earnedTotal - paidTotal
  absences: Absence[]
  payments: Payment[]
}
