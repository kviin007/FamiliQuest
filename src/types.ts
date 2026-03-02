export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'duty' | 'task' | 'general';
  date: string;
  createdBy: string;
}

export type View = 'login' | 'dashboard' | 'admin' | 'upload' | 'alert' | 'voting' | 'ranking' | 'settlement' | 'invitation' | 'chat' | 'pass-task' | 'confirm-payments' | 'create-task' | 'profile';

export interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  fine: number;
  value: number; // The monetary value of the task
  status: 'pending' | 'completed' | 'validated' | 'failed';
  icon: string;
  category: string;
  taskType: 'duty' | 'obligation';
  dueDate?: string;
  assignedTo?: string;
  imageUrl?: string; // To store the attached image
  completedAt?: string; // To track when it was completed for weekly cleanup
  isVotingActive?: boolean;
  votes?: {
    userId: string;
    vote: 'good' | 'bad';
  }[];
  penaltyMultiplier?: number; // 1 by default, 2 for double penalty
}

export interface Member {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'member';
  level: number;
  xp: number;
  hearts: number;
  streak: number;
  debt: number; // Weekly debt (starts negative)
  avatar: string;
  progress: number;
  paymentInfo?: {
    type: 'nequi' | 'bancolombia';
    number: string;
  };
  availability?: Record<string, string[]>; // e.g., { 'Monday': ['Morning', 'Afternoon'] }
  settings?: {
    darkMode: boolean;
  };
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'fine' | 'subscription';
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  isAdminAlert?: boolean;
}

export interface Appeal {
  id: string;
  taskId: string;
  taskTitle: string;
  imageUrl: string;
  userId: string;
  userName: string;
  reason: string;
  votes: {
    userId: string;
    vote: 'approve' | 'reject';
  }[];
  status: 'pending' | 'resolved';
}
