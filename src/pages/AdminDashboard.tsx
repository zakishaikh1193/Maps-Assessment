import React, { useState, useEffect } from 'react';
import { Subject, Question, AdminStats } from '../types';
import { subjectsAPI, adminAPI } from '../services/api';
import QuestionForm from '../components/QuestionForm';
import QuestionList from '../components/QuestionList';
import AdminStatsCard from '../components/AdminStatsCard';
import Navigation from '../components/Navigation';
import { Plus, BookOpen, Users, FileQuestion, BarChart3 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadQuestions(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadInitialData = async () => {
    try {
      const [subjectsData, statsData] = await Promise.all([
        subjectsAPI.getAll(),
        adminAPI.getStats()
      ]);
      setSubjects(subjectsData);
      setStats(statsData);
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
    loadInitialData(); // Refresh stats
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
    loadInitialData(); // Refresh stats
  };

  const handleEditQuestion = async (question: Question) => {
    try {
      // Fetch fresh question data from server
      const freshQuestion = await adminAPI.getQuestion(question.id);
      setEditingQuestion(freshQuestion);
      setShowQuestionForm(true);
    } catch (error) {
      console.error('Failed to fetch question for editing:', error);
      // Fallback to using the question from the list
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage questions and view assessment statistics</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileQuestion className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
                  <p className="text-gray-600">Total Questions</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  <p className="text-gray-600">Total Students</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
                  <p className="text-gray-600">Assessments Taken</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Subjects Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span>Subjects</span>
              </h2>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                      selectedSubject?.id === subject.id
                        ? 'bg-blue-100 text-blue-900 border-2 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-medium">{subject.name}</div>
                    <div className="text-sm text-gray-500">
                      {questions.filter(q => selectedSubject?.id === subject.id).length} questions
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {stats && <AdminStatsCard stats={stats} />}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSubject && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedSubject.name} Questions
                        </h2>
                        <p className="text-gray-600 mt-1">
                          Manage questions for {selectedSubject.name} assessments
                        </p>
                      </div>
                      <button
                        onClick={() => setShowQuestionForm(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <Plus className="h-5 w-5" />
                        <span>Add Question</span>
                      </button>
                    </div>
                  </div>

                  {showQuestionForm && (
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
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
      </div>
    </div>
  );
};

export default AdminDashboard;