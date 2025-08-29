export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  firstName?: string;
  lastName?: string;
  school?: {
    id: number;
    name: string;
  };
  grade?: {
    id: number;
    name: string;
    display_name: string;
    level: number;
  };
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
}

export interface School {
  id: number;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at?: string;
}

export interface Grade {
  id: number;
  name: string;
  display_name: string;
  grade_level?: number | null;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Question {
  id: number;
  subjectId: number;
  gradeId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  difficultyLevel: number;
  createdBy?: number;
  createdAt?: string;
  createdByUsername?: string;
  gradeName?: string;
  competencies?: Array<{
    id: number;
    code: string;
    name: string;
  }>;
}

export interface Assessment {
  id: number;
  studentId: number;
  subjectId: number;
  assessmentPeriod: 'Fall' | 'Winter' | 'Spring';
  ritScore?: number;
  correctAnswers?: number;
  totalQuestions: number;
  dateTaken: string;
  durationMinutes?: number;
  year: number;
  subjectName?: string;
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  options: string[];
  questionNumber: number;
  totalQuestions: number;
}

export interface AssessmentResponse {
  completed: boolean;
  isCorrect?: boolean;
  ritScore?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  duration?: number;
  currentRIT?: number;
  nextDifficulty?: number;
  message?: string;
  assessmentId?: number;
  question?: AssessmentQuestion;
}

export interface AssessmentResult {
  questionNumber: number;
  isCorrect: boolean;
  difficulty: number;
  questionText: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
}

export interface DifficultyProgression {
  questionNumber: number;
  difficulty: number;
  isCorrect: boolean;
}

export interface GrowthDataPoint {
  period: string;
  year: number;
  assessmentPeriod: string;
  ritScore: number;
  dateTaken: string;
}

export interface ClassAverageDataPoint {
  period: string;
  year: number;
  assessmentPeriod: string;
  averageRITScore: number;
  studentCount: number;
}

export interface PeriodDistribution {
  period: string;
  year: number;
  assessmentPeriod: string;
  totalStudents: number;
  distributions: {
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
  };
}

export interface GrowthOverTimeData {
  subjectName: string;
  schoolName?: string;
  gradeName?: string;
  studentScores: GrowthDataPoint[];
  classAverages: ClassAverageDataPoint[];
  districtAverages?: ClassAverageDataPoint[];
  periodDistributions: PeriodDistribution[];
  totalAssessments: number;
}

export interface DetailedAssessmentResults {
  assessment: {
    id: number;
    subjectName: string;
    period: string;
    year: number;
    dateTaken: string;
    duration: number;
  };
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    previousRIT: number | null;
    currentRIT: number;
    accuracy: number;
  };
  responses: AssessmentResult[];
  difficultyProgression: DifficultyProgression[];
  previousAssessment: {
    ritScore: number;
    dateTaken: string;
    period: string;
    year: number;
  } | null;
}

export interface DashboardData {
  subjectId: number;
  subjectName: string;
  assessments: Assessment[];
}

export interface AssessmentConfiguration {
  id: number;
  gradeId: number;
  subjectId: number;
  timeLimitMinutes: number;
  questionCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  gradeName?: string;
  subjectName?: string;
}

export interface AdminStats {
  totalQuestions: number;
  totalStudents: number;
  totalAssessments: number;
  difficultyDistribution: Array<{
    difficulty_range: string;
    count: number;
  }>;
  subjectDistribution: Array<{
    name: string;
    question_count: number;
  }>;
}

export interface Competency {
  id: number;
  code: string;
  name: string;
  description?: string;
  strong_description: string;
  neutral_description: string;
  growth_description: string;
  strong_threshold: number;
  neutral_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetencyStats {
  id: number;
  code: string;
  name: string;
  questions_linked: number;
  students_assessed: number;
  average_score: number;
  strong_count: number;
  neutral_count: number;
  growth_count: number;
}