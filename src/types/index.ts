export type Role = 'parent' | 'child'
export type ChoreType = 'daily' | 'weekly' | 'once'
export type TaskStatus = 'tekematon' | 'tehty' | 'merkitty'
export type AbsenceType = 'loma' | 'sairas'

export interface Member {
  uid: string
  role: Role
  firstName: string
  familyId: string
  username?: string  // child only: 'aino.abc123' (stored lowercase)
  pin?: string       // child only: '1234' (plain text, visible to parent)
  paidTotal?: number
}

export interface Family {
  id: string
  familyCode: string  // e.g. 'ABC123'
  name: string
  createdAt: Date
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
export type Assignment = Partial<Record<DayKey, string[]>> & { all?: string }

export interface WeeklyPlan {
  weekId: string
  assignments: Record<string, Assignment>
}

export interface TaskInstance {
  id: string
  choreId: string
  choreName: string
  memberId: string
  date: string        // 'YYYY-MM-DD'
  isoWeek: string     // 'YYYY-WNN'
  priceCents: number
  status: TaskStatus
  completedAt: string | null
}

export interface Absence {
  id: string
  type: AbsenceType
  from: string
  to: string
}

export interface Payment {
  id: string
  amount: number
  date: Date
}

export interface ChildProfile {
  member: Member
  earnedTotal: number
  paidTotal: number
  outstanding: number
  absences: Absence[]
  payments: Payment[]
}
