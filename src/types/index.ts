export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  firstName?: string;
  lastName?: string;
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
}

export interface Question {
  id: number;
  subjectId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  difficultyLevel: number;
  createdBy?: number;
  createdAt?: string;
  createdByUsername?: string;
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
  studentScores: GrowthDataPoint[];
  classAverages: ClassAverageDataPoint[];
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