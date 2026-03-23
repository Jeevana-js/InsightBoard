export type TaskStatus = 'New' | 'In Development' | 'Resolved' | 'Closed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;
  dueDate?: string;
  acceptanceCriteria: string[];
  subTasks: string[];
  createdAt: string;
}

export const COLUMNS: TaskStatus[] = ['New', 'In Development', 'Resolved', 'Closed'];

export const TEAM_MEMBERS = [
  'Alex Rivera',
  'Jordan Smith',
  'Taylor Chen',
  'Morgan Lee',
  'Casey Wright',
  'Riley Quinn'
];