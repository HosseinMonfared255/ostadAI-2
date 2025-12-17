export enum Difficulty {
  EASY = 'آسان',
  MEDIUM = 'متوسط',
  HARD = 'سخت',
}

export enum Importance {
  LOW = 'کم',
  MEDIUM = 'متوسط',
  HIGH = 'زیاد',
}

export enum TaskType {
  STUDY = 'STUDY',      // مطالعه
  REVIEW = 'REVIEW',    // مرور
  TEST = 'TEST',        // آزمون
  PRACTICE = 'PRACTICE',// تمرین عملی
  TEACH = 'TEACH',      // تدریس
}

export enum Phase {
  EDUCATION = 'EDUCATION',       // آموزش
  PRACTICE = 'PRACTICE',         // تمرین
  CONSOLIDATION = 'CONSOLIDATION', // تثبیت
  MASTERY = 'MASTERY',           // تسلط
}

export interface Task {
  id: string;
  projectId: string;
  date: string; // ISO string
  type: TaskType;
  description: string;
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  pageCount: number;
  difficulty: Difficulty;
  importance: Importance;
  color: string; // Hex color for UI
  createdAt: string;
  currentPhase: Phase;
  tasks: Task[];
  progress: number; // 0-100
}

export interface CreateProjectInput {
  name: string;
  pageCount: number;
  difficulty: Difficulty;
  importance: Importance;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.STUDY]: 'مطالعه',
  [TaskType.REVIEW]: 'مرور',
  [TaskType.TEST]: 'آزمون',
  [TaskType.PRACTICE]: 'تمرین عملی',
  [TaskType.TEACH]: 'تدریس',
};

export const PHASE_LABELS: Record<Phase, string> = {
  [Phase.EDUCATION]: 'آموزش',
  [Phase.PRACTICE]: 'تمرین',
  [Phase.CONSOLIDATION]: 'تثبیت',
  [Phase.MASTERY]: 'تسلط عمیق',
};