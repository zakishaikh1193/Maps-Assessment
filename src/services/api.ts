import axios from 'axios';
import { User, Subject, Question, Assessment, AssessmentResponse, DashboardData, AdminStats } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  register: async (userData: {
    username: string;
    password: string;
    role: 'admin' | 'student';
    firstName?: string;
    lastName?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  }
};

export const subjectsAPI = {
  getAll: async (): Promise<Subject[]> => {
    const response = await api.get('/subjects');
    return response.data;
  },

  getById: async (id: number): Promise<Subject> => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  }
};

export const adminAPI = {
  createQuestion: async (questionData: {
    subjectId: number;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    difficultyLevel: number;
  }) => {
    const response = await api.post('/admin/questions', questionData);
    return response.data;
  },

  getQuestions: async (subjectId: number): Promise<Question[]> => {
    const response = await api.get(`/admin/questions/${subjectId}`);
    return response.data;
  },

  getQuestion: async (questionId: number): Promise<Question> => {
    const response = await api.get(`/admin/question/${questionId}`);
    return response.data;
  },

  updateQuestion: async (questionId: number, questionData: {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    difficultyLevel: number;
  }) => {
    const response = await api.put(`/admin/questions/${questionId}`, questionData);
    return response.data;
  },

  deleteQuestion: async (questionId: number) => {
    const response = await api.delete(`/admin/questions/${questionId}`);
    return response.data;
  },

  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export const studentAPI = {
  startAssessment: async (subjectId: number, period: 'Fall' | 'Winter' | 'Spring') => {
    const response = await api.post('/student/assessments/start', { subjectId, period });
    return response.data;
  },

  submitAnswer: async (questionId: number, answerIndex: number, assessmentId: number): Promise<AssessmentResponse> => {
    const response = await api.post('/student/assessments/answer', {
      questionId,
      answerIndex,
      assessmentId
    });
    return response.data;
  },

  getResults: async (subjectId: number): Promise<Assessment[]> => {
    const response = await api.get(`/student/assessments/results/${subjectId}`);
    return response.data;
  },

  getDashboardData: async (): Promise<DashboardData[]> => {
    const response = await api.get('/student/assessments/dashboard');
    return response.data;
  }
};

export default api;