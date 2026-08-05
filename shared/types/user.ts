export type UserRole = "PARENT" | "CHILD";

export interface ParentUser {
  id: string;
  username: string;
  nickname: string;
  role: "PARENT";
  currentChildId?: string | null;
}

export interface ChildUser {
  id: string;
  username: string;
  nickname: string;
  role: "CHILD";
  currentChildId: string;
}

export type AuthUser = ParentUser | ChildUser;

export interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
  pet: string;
  account?: { id: string; username: string; nickname: string } | null;
}
