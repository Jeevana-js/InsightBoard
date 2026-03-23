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

export interface Member {
  id: string;
  name: string;
  role: 'Admin' | 'Member';
  email: string;
  status: 'Active' | 'Inactive';
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

export const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Alex Rivera', role: 'Admin', email: 'alex@sprintsync.com', status: 'Active' },
  { id: '2', name: 'Jordan Smith', role: 'Member', email: 'jordan@sprintsync.com', status: 'Active' },
  { id: '3', name: 'Taylor Chen', role: 'Member', email: 'taylor@sprintsync.com', status: 'Active' },
  { id: '4', name: 'Morgan Lee', role: 'Member', email: 'morgan@sprintsync.com', status: 'Active' },
];
