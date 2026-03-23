export type TaskStatus = string;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  role: 'Admin' | 'Member';
  email: string;
  status: 'Active' | 'Inactive';
}

export const INITIAL_COLUMNS: string[] = ['New', 'In Development', 'Ready for Review', 'Resolved', 'Closed'];

export const COLUMNS = INITIAL_COLUMNS; // Legacy support

export const TEAM_MEMBERS: string[] = [];

export const INITIAL_MEMBERS: Member[] = [];
