export enum Difficulty {
  EASY = 'آسان',
  MEDIUM = 'متوسط',
  HARD = 'سخت',
}

export enum Importance {
  VERY_LOW = 'خیلی پایین',
  LOW = 'پایین',
  MEDIUM = 'متوسط',
  HIGH = 'زیاد',
  CRITICAL = 'حیاتی',
}

export enum TaskType {
  STUDY = 'STUDY',      // مطالعه (matches LEARN/KNOWLEDGE)
  REVIEW = 'REVIEW',    // مرور
  TEST = 'TEST',        // آزمون
  PRACTICE = 'PRACTICE',// تمرین عملی (matches ABILITY)
  TEACH = 'TEACH',      // تدریس
}

export enum Phase {
  EDUCATION = 'EDUCATION',       // آموزش
  PRACTICE = 'PRACTICE',         // تمرین
  CONSOLIDATION = 'CONSOLIDATION', // تثبیت
  MASTERY = 'MASTERY',           // تسلط
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sat, 6=Fri (Persian standard)

export interface TimeRange {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface StudySchedule {
  isDaily: boolean;
  routine?: TimeRange;
  weeklyCustom?: Record<number, TimeRange | null>;
}

export interface Task {
  id: string;
  projectId: string;
  date: string; // ISO string
  type: TaskType;
  description: string;
  isCompleted: boolean;
}

export interface Question {
  qid: string;
  text: string;
  answer_type: 'choice' | 'number' | 'text';
  choices?: { key: string; label: string }[];
}

export interface Checkpoint {
  id: string;
  day_offset: number;
  when_time: string;
  purpose: string;
  questions: Question[];
  isCompleted?: boolean;
}

export interface AnalysisResult {
  learning_state: 'Superficial' | 'Fragile' | 'Stable' | 'Deep';
  diagnosis: string;
  illusion_of_competence: {
    detected: boolean;
    reason?: string;
    corrective_action?: string;
  };
  next_action: TaskType;
  scheduling_recommendation: string;
  future_projection: string;
  user_feedback: string; // The Persian message
  estimated_dou: number; // 0-100 Internal metric
  analyzedAt: string;
}

export interface Project {
  id: string;
  name: string;
  pageCount: number;
  chapterCount: number;
  chapters: string[];
  difficulty: Difficulty;
  importance: Importance;
  schedule: StudySchedule;
  color: string; // Hex color for UI
  createdAt: string;
  currentPhase: Phase;
  tasks: Task[];
  checkpoints: Checkpoint[];
  progress: number; // 0-100
  lastAnalysis?: AnalysisResult;
}

export interface CreateProjectInput {
  name: string;
  pageCount: number;
  chapterCount: number;
  chapters: string[];
  difficulty: Difficulty;
  importance: Importance;
  schedule: StudySchedule;
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

export const STATE_LABELS: Record<string, string> = {
  'Superficial': 'سطحی',
  'Fragile': 'شکننده',
  'Stable': 'پایدار',
  'Deep': 'عمیق',
};

export const PERSIAN_DAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
];