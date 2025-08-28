import React, { useState, useEffect } from 'react';
import { Subject, Question, AdminStats } from '../types';
import { subjectsAPI, adminAPI } from '../services/api';
import QuestionForm from '../components/QuestionForm';
import QuestionList from '../components/QuestionList';
import SubjectForm from '../components/SubjectForm';
import SubjectList from '../components/SubjectList';
import AdminStatsCard from '../components/AdminStatsCard';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import Navigation from '../components/Navigation';
import { Plus, BookOpen, Users, FileQuestion, BarChart3, TrendingUp, User, Settings } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Growth chart states
  const [activeTab, setActiveTab] = useState<'questions' | 'growth' | 'subjects'>('questions');
  const [students, setStudents] = useState<Array<{id: number, username: string, firstName?: string, lastName?: string}>>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);

  // Subjects management states
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadQuestions(selectedSubject.id);
    }
  }, [selectedSubject]);

  // Load growth data when student and subject are selected
  useEffect(() => {
    if (activeTab === 'growth' && selectedStudent && selectedSubject) {
      setGrowthLoading(true);
      setGrowthData(null);
      adminAPI.getStudentGrowth(selectedStudent, selectedSubject.id)
        .then(data => {
          setGrowthData(data);
          setGrowthLoading(false);
        })
        .catch(error => {
          console.error('Error fetching growth data:', error);
          setGrowthLoading(false);
        });
    }
  }, [activeTab, selectedStudent, selectedSubject]);

  const loadInitialData = async () => {
    try {
      const [subjectsData, statsData, studentsData] = await Promise.all([
        subjectsAPI.getAll(),
        adminAPI.getStats(),
        adminAPI.getStudents()
      ]);
      setSubjects(subjectsData);
      setStats(statsData);
      setStudents(studentsData);
      if (subjectsData.length > 0) {
        setSelectedSubject(subjectsData[0]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (subjectId: number) => {
    try {
      const questionsData = await adminAPI.getQuestions(subjectId);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleQuestionCreated = () => {
    setShowQuestionForm(false);
    if (selectedSubject) {
      loadQuestions(selectedSubject.id);
    }
    loadInitialData();
  };

  const handleQuestionUpdated = () => {
    setEditingQuestion(null);
    setShowQuestionForm(false);
    if (selectedSubject) {
      loadQuestions(selectedSubject.id);
    }
  };

  const handleQuestionDeleted = () => {
    if (selectedSubject) {
      loadQuestions(selectedSubject.id);
    }
    loadInitialData();
  };

  // Subjects management functions
  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects(prev => [...prev, newSubject]);
    setShowSubjectForm(false);
    setEditingSubject(null);
    loadInitialData(); // Refresh stats
  };

  const handleSubjectUpdated = (updatedSubject: Subject) => {
    setSubjects(prev => prev.map(s => s.id === updatedSubject.id ? updatedSubject : s));
    setShowSubjectForm(false);
    setEditingSubject(null);
    loadInitialData(); // Refresh stats
  };

  const handleSubjectDeleted = async (subjectId: number) => {
    try {
      await subjectsAPI.delete(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      // If the deleted subject was selected, select the first available subject
      if (selectedSubject?.id === subjectId) {
        const remainingSubjects = subjects.filter(s => s.id !== subjectId);
        if (remainingSubjects.length > 0) {
          setSelectedSubject(remainingSubjects[0]);
        } else {
          setSelectedSubject(null);
        }
      }
      
      loadInitialData(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete subject:', error);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setShowSubjectForm(true);
  };

  const handleAddSubject = () => {
    setEditingSubject(null);
    setShowSubjectForm(true);
  };

  const handleEditQuestion = async (question: Question) => {
    try {
      const freshQuestion = await adminAPI.getQuestion(question.id);
      setEditingQuestion(freshQuestion);
      setShowQuestionForm(true);
    } catch (error) {
      console.error('Failed to fetch question for editing:', error);
      setEditingQuestion(question);
      setShowQuestionForm(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-white/80">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Admin Command Center
              </h1>
              <p className="text-purple-200 text-lg">
                Manage assessments and analyze student performance
              </p>
            </div>
            <div className="ml-auto">
              <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 hover:border-purple-400/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-400/30">
                  <FileQuestion className="h-8 w-8 text-purple-300" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalQuestions}</p>
                  <p className="text-purple-200">Total Questions</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Database className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-purple-300">Active Database</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-6 hover:border-blue-400/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30">
                  <Users className="h-8 w-8 text-blue-300" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalStudents}</p>
                  <p className="text-blue-200">Active Students</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Activity className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-blue-300">Enrolled Users</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6 hover:border-emerald-400/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                  <Target className="h-8 w-8 text-emerald-300" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.totalAssessments}</p>
                  <p className="text-emerald-200">Assessments Taken</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-emerald-300">Completed Tests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 mb-8 shadow-2xl">
          <div className="flex">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 px-8 py-4 text-sm font-semibold rounded-xl transition-all duration-300 ${
                activeTab === 'questions'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <Settings className="h-5 w-5" />
                <span>QUESTION MANAGEMENT</span>
                {activeTab === 'questions' && <Sparkles className="h-4 w-4 animate-pulse" />}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`flex-1 px-8 py-4 text-sm font-semibold rounded-xl transition-all duration-300 ${
                activeTab === 'growth'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <TrendingUp className="h-5 w-5" />
                <span>STUDENT ANALYTICS</span>
                {activeTab === 'growth' && <Sparkles className="h-4 w-4 animate-pulse" />}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'subjects'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>SUBJECTS</span>
              </div>
            </button>
          </div>
        </div>

        {/* Questions Management Tab Content */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Enhanced Subjects Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-purple-400" />
                  <span>Subjects</span>
                </h2>
                <div className="space-y-3">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                        selectedSubject?.id === subject.id
                          ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white border-2 border-purple-400/50 shadow-lg'
                          : 'text-gray-300 hover:bg-white/10 border-2 border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold">{subject.name}</div>
                      <div className="text-sm opacity-75 mt-1">
                        {questions.filter(q => selectedSubject?.id === subject.id).length} questions
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {stats && <AdminStatsCard stats={stats} />}
            </div>

            {/* Enhanced Main Content */}
            <div className="lg:col-span-3">
              {selectedSubject && (
                <>
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 mb-6 shadow-2xl">
                    <div className="p-6 border-b border-white/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                            <Brain className="h-7 w-7 text-purple-400" />
                            <span>{selectedSubject.name} Questions</span>
                          </h2>
                          <p className="text-purple-200 mt-2">
                            Manage adaptive assessment questions for {selectedSubject.name}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowQuestionForm(true)}
                          className="group flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                          <span>Add Question</span>
                          <Zap className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                      </div>
                    </div>

                    {showQuestionForm && (
                      <div className="p-6 border-b border-white/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                        <QuestionForm
                          subjects={subjects}
                          selectedSubject={selectedSubject}
                          editingQuestion={editingQuestion}
                          onQuestionCreated={handleQuestionCreated}
                          onQuestionUpdated={handleQuestionUpdated}
                          onCancel={handleCancelEdit}
                        />
                      </div>
                    )}
                  </div>

                  <QuestionList
                    questions={questions}
                    onEdit={handleEditQuestion}
                    onDelete={handleQuestionDeleted}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Student Growth Tab Content */}
        {activeTab === 'growth' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Enhanced Selection Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-purple-400" />
                  <span>Subject</span>
                </h2>
                <div className="space-y-3">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                        selectedSubject?.id === subject.id
                          ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white border-2 border-purple-400/50 shadow-lg'
                          : 'text-gray-300 hover:bg-white/10 border-2 border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold">{subject.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-3">
                  <User className="h-6 w-6 text-emerald-400" />
                  <span>Student</span>
                </h2>
                <div className="space-y-3">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                        selectedStudent === student.id
                          ? 'bg-gradient-to-r from-emerald-500/30 to-blue-500/30 text-white border-2 border-emerald-400/50 shadow-lg'
                          : 'text-gray-300 hover:bg-white/10 border-2 border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold">
                        {student.firstName && student.lastName 
                          ? `${student.firstName} ${student.lastName}`
                          : student.username
                        }
                      </div>
                      <div className="text-sm opacity-75 mt-1">
                        @{student.username}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Growth Chart Content */}
            <div className="lg:col-span-3">
              {selectedSubject && selectedStudent ? (
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-3 flex items-center space-x-3">
                      <BarChart3 className="h-7 w-7 text-emerald-400" />
                      <span>Student Performance Analytics</span>
                    </h2>
                    <p className="text-purple-200">
                      {students.find(s => s.id === selectedStudent)?.firstName || 'Student'} - {selectedSubject.name}
                    </p>
                  </div>

                  {growthLoading ? (
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                        <p className="text-white/80">Analyzing performance data...</p>
                      </div>
                    </div>
                  ) : growthData ? (
                    <GrowthOverTimeChart data={growthData} />
                  ) : (
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                      <div className="text-center">
                        <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300">Select a subject and student to view growth data.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                  <div className="text-center">
                    <div className="flex justify-center space-x-4 mb-6">
                      <BookOpen className="h-12 w-12 text-purple-400" />
                      <User className="h-12 w-12 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Select Subject & Student</h3>
                    <p className="text-gray-300">Choose both a subject and a student to view detailed growth analysis.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjects Management Tab Content */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <SubjectList
              subjects={subjects}
              onEdit={handleEditSubject}
              onDelete={handleSubjectDeleted}
              onAddNew={handleAddSubject}
              loading={subjectsLoading}
            />
          </div>
        )}

        {/* Subject Form Modal */}
        {showSubjectForm && (
          <SubjectForm
            subject={editingSubject}
            onClose={() => {
              setShowSubjectForm(false);
              setEditingSubject(null);
            }}
            onSubjectCreated={handleSubjectCreated}
            onSubjectUpdated={handleSubjectUpdated}
          />
        )}

        {/* Question Form Modal */}
        {showQuestionForm && selectedSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <QuestionForm
                subjects={subjects}
                selectedSubject={selectedSubject}
                editingQuestion={editingQuestion}
                onQuestionCreated={handleQuestionCreated}
                onQuestionUpdated={handleQuestionUpdated}
                onCancel={handleCancelEdit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;