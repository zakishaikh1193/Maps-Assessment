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
  question?: AssessmentQuestion;
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