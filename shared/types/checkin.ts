export type CheckInStatus = "not_started" | "in_progress" | "completed" | "claimed";

export interface CheckInTask {
  id: string;
  recordId: string;
  subject: string;
  taskType: string;
  completed: boolean;
  pointsEarned: number;
  completedAt?: string;
}

export interface CheckInRecord {
  id: string;
  childId: string;
  date: string;
  allCompleted: boolean;
  bonusEarned: boolean;
  tasks: CheckInTask[];
}
