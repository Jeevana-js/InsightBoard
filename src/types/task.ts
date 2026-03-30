export type TaskStatus = string;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  adminComment?: string;
  memberComment?: string;
  creatorId?: string;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  inviteCode: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  role: 'Admin' | 'Member';
  email: string;
  status: 'Active' | 'Inactive';
  rating?: number;
}

export function generateInviteCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const array = new Uint8Array(7);
  crypto.getRandomValues(array);
  for (let i = 0; i < 7; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export const INITIAL_COLUMNS: string[] = ['New', 'In Development', 'Testing', 'Resolved', 'Closed'];

export const COLUMNS = INITIAL_COLUMNS; // Legacy support

export const TEAM_MEMBERS: string[] = [];

export const INITIAL_MEMBERS: Member[] = [];
