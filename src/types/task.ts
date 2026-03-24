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
  teacherComment?: string;
  studentComment?: string;
  creatorId?: string;
}

export interface Member {
  id: string;
  name: string;
  role: 'Admin' | 'Member';
  email: string;
  status: 'Active' | 'Inactive';
  rating?: number;
}

export const INITIAL_COLUMNS: string[] = ['New', 'In Development', 'Ready for Review', 'Resolved', 'Closed'];

export const COLUMNS = INITIAL_COLUMNS; // Legacy support

export const TEAM_MEMBERS: string[] = [];

export const INITIAL_MEMBERS: Member[] = [];
