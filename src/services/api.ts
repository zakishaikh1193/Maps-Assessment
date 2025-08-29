import axios from 'axios';
import { User, Subject, Question, Assessment, AssessmentResponse, DashboardData, AdminStats, School, Grade, AssessmentConfiguration, Competency, CompetencyStats } from '../types';

// const API_BASE_URL = 'https://map-test.bylinelms.com/api';
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
  },

  create: async (subjectData: { name: string; description?: string }) => {
    const response = await api.post('/subjects', subjectData);
    return response.data;
  },

  update: async (id: number, subjectData: { name: string; description?: string }) => {
    const response = await api.put(`/subjects/${id}`, subjectData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  }
};

export const adminAPI = {
  createQuestion: async (questionData: {
    subjectId: number;
    gradeId: number;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    difficultyLevel: number;
    competencies?: Array<{ id: number }>;
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
    subjectId: number;
    gradeId: number;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    difficultyLevel: number;
    competencies?: Array<{ id: number }>;
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
  },

  getStudents: async (): Promise<Array<{id: number, username: string, firstName?: string, lastName?: string}>> => {
    const response = await api.get('/admin/students');
    return response.data;
  },

  getStudentGrowth: async (studentId: number, subjectId: number) => {
    const response = await api.get(`/admin/students/${studentId}/growth/${subjectId}`);
    return response.data;
  },
  
  // Analytics APIs
  getSubjectPerformance: async (filters?: { schoolId?: number; gradeId?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId.toString());
    if (filters?.gradeId) params.append('gradeId', filters.gradeId.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const response = await api.get(`/admin/analytics/subject-performance?${params}`);
    return response.data;
  },
  
  getAchievementGaps: async (filters?: { schoolId?: number; gradeId?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId.toString());
    if (filters?.gradeId) params.append('gradeId', filters.gradeId.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const response = await api.get(`/admin/analytics/achievement-gaps?${params}`);
    return response.data;
  },
  
  getCompetencyMastery: async (filters?: { schoolId?: number; gradeId?: number; subjectId?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId.toString());
    if (filters?.gradeId) params.append('gradeId', filters.gradeId.toString());
    if (filters?.subjectId) params.append('subjectId', filters.subjectId.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const response = await api.get(`/admin/analytics/competency-mastery?${params}`);
    return response.data;
  },
  
  getCompetencyGrowth: async (filters?: { schoolId?: number; gradeId?: number; subjectId?: number; competencyId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId.toString());
    if (filters?.gradeId) params.append('gradeId', filters.gradeId.toString());
    if (filters?.subjectId) params.append('subjectId', filters.subjectId.toString());
    if (filters?.competencyId) params.append('competencyId', filters.competencyId.toString());
    const response = await api.get(`/admin/analytics/competency-growth?${params}`);
    return response.data;
  }
};

export const schoolsAPI = {
  getAll: async (): Promise<School[]> => {
    const response = await api.get('/schools');
    return response.data;
  },

  getById: async (id: number): Promise<School> => {
    const response = await api.get(`/schools/${id}`);
    return response.data;
  },

  create: async (schoolData: { name: string; address?: string; contact_email?: string; contact_phone?: string }) => {
    const response = await api.post('/schools', schoolData);
    return response.data;
  },

  update: async (id: number, schoolData: { name: string; address?: string; contact_email?: string; contact_phone?: string }) => {
    const response = await api.put(`/schools/${id}`, schoolData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/schools/${id}`);
    return response.data;
  },

  getStats: async (id: number) => {
    const response = await api.get(`/schools/${id}/stats`);
    return response.data;
  }
};

export const gradesAPI = {
  getAll: async (): Promise<Grade[]> => {
    const response = await api.get('/grades');
    return response.data;
  },

  getActive: async (): Promise<Grade[]> => {
    const response = await api.get('/grades/active');
    return response.data;
  },

  getById: async (id: number): Promise<Grade> => {
    const response = await api.get(`/grades/${id}`);
    return response.data;
  },

  create: async (gradeData: { name: string; display_name: string; grade_level?: number | null; description?: string; is_active?: boolean }) => {
    const response = await api.post('/grades', gradeData);
    return response.data;
  },

  update: async (id: number, gradeData: { name: string; display_name: string; grade_level?: number | null; description?: string; is_active?: boolean }) => {
    const response = await api.put(`/grades/${id}`, gradeData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/grades/${id}`);
    return response.data;
  },

  getStats: async (id: number) => {
    const response = await api.get(`/grades/${id}/stats`);
    return response.data;
  }
};

export const assessmentConfigAPI = {
  getAll: async (): Promise<AssessmentConfiguration[]> => {
    const response = await api.get('/admin/assessment-configs');
    return response.data;
  },

  getById: async (id: number): Promise<AssessmentConfiguration> => {
    const response = await api.get(`/admin/assessment-configs/${id}`);
    return response.data;
  },

  getByGradeSubject: async (gradeId: number, subjectId: number): Promise<AssessmentConfiguration> => {
    const response = await api.get(`/admin/assessment-configs/grade/${gradeId}/subject/${subjectId}`);
    return response.data;
  },

  create: async (configData: { gradeId: number; subjectId: number; timeLimitMinutes: number; questionCount: number; isActive?: boolean }) => {
    const response = await api.post('/admin/assessment-configs', configData);
    return response.data;
  },

  update: async (id: number, configData: { gradeId: number; subjectId: number; timeLimitMinutes: number; questionCount: number; isActive?: boolean }) => {
    const response = await api.put(`/admin/assessment-configs/${id}`, configData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/admin/assessment-configs/${id}`);
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
  },

  getAvailableSubjects: async (): Promise<Subject[]> => {
    const response = await api.get('/student/subjects/available');
    return response.data;
  },

  getDetailedResults: async (assessmentId: number) => {
    const response = await api.get(`/student/assessments/results/detailed/${assessmentId}`);
    return response.data;
  },

  getLatestAssessmentDetails: async (subjectId: number) => {
    const response = await api.get(`/student/assessments/latest/${subjectId}`);
    return response.data;
  },

  getGrowthOverTime: async (subjectId: number) => {
    const response = await api.get(`/student/assessments/growth/${subjectId}`);
    return response.data;
  },

  getCompetencyScores: async (assessmentId: number) => {
    const response = await api.get(`/student/assessments/${assessmentId}/competencies`);
    return response.data;
  },

  getCompetencyGrowth: async (subjectId: number) => {
    const response = await api.get(`/student/assessments/competency-growth/${subjectId}`);
    return response.data;
  }
};

// Students API (Admin)
export const studentsAPI = {
  getAll: async () => {
    const response = await api.get('/admin/students');
    return response.data;
  },

  create: async (studentData: { 
    username: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    schoolId: number; 
    gradeId: number; 
  }) => {
    const response = await api.post('/admin/students', studentData);
    return response.data;
  },

  update: async (id: number, studentData: { 
    firstName: string; 
    lastName: string; 
    schoolId: number; 
    gradeId: number; 
    password?: string; 
  }) => {
    const response = await api.put(`/admin/students/${id}`, studentData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
  },

  getGrowth: async (studentId: number, subjectId: number) => {
    const response = await api.get(`/admin/students/${studentId}/growth/${subjectId}`);
    return response.data;
  },

  getBySchoolAndGrade: async (schoolId: number, gradeId: number) => {
    const response = await api.get(`/admin/students/school/${schoolId}/grade/${gradeId}`);
    return response.data;
  }
};

// Competencies API
export const competenciesAPI = {
  getAll: () => api.get<Competency[]>('/admin/competencies').then(res => res.data),
  getActive: () => api.get<Competency[]>('/admin/competencies/active').then(res => res.data),
  getById: (id: number) => api.get<Competency>(`/admin/competencies/${id}`).then(res => res.data),
  create: (data: Omit<Competency, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<{message: string, competency: Competency}>('/admin/competencies', data).then(res => res.data),
  update: (id: number, data: Partial<Competency>) => 
    api.put<{message: string, competency: Competency}>(`/admin/competencies/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete<{message: string}>(`/admin/competencies/${id}`).then(res => res.data),
  getStats: () => api.get<CompetencyStats[]>('/admin/competencies/stats').then(res => res.data),
  getQuestions: (id: number) => api.get(`/admin/competencies/${id}/questions`).then(res => res.data),
  getStudentCompetencyScores: (studentId?: number, assessmentId?: number) => 
    api.get('/admin/student-competency-scores', { 
      params: { studentId, assessmentId } 
    }).then(res => res.data),
  getStudentCompetencyGrowth: (studentId: number, subjectId: number) => 
    api.get('/admin/student-competency-growth', { 
      params: { studentId, subjectId } 
    }).then(res => res.data)
};

export default api;