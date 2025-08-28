import React, { useState, useEffect } from 'react';
import { Subject, Question, AdminStats, School, Grade } from '../types';
import { subjectsAPI, adminAPI, schoolsAPI, gradesAPI } from '../services/api';
import QuestionForm from '../components/QuestionForm';
import QuestionList from '../components/QuestionList';
import SubjectForm from '../components/SubjectForm';
import SubjectList from '../components/SubjectList';
import SchoolForm from '../components/SchoolForm';
import SchoolList from '../components/SchoolList';
import GradeForm from '../components/GradeForm';
import GradeList from '../components/GradeList';
import StudentList from '../components/StudentList';
import AdminStatsCard from '../components/AdminStatsCard';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import Navigation from '../components/Navigation';
import AssessmentConfigList from '../components/AssessmentConfigList';
import { Plus, BookOpen, Users, FileQuestion, BarChart3, TrendingUp, User, Settings, Building, GraduationCap, Clock } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Growth chart states
  const [activeTab, setActiveTab] = useState<'students' | 'questions' | 'growth' | 'subjects' | 'schools' | 'grades' | 'configs'>('students');
  const [students, setStudents] = useState<Array<{id: number, username: string, firstName?: string, lastName?: string}>>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);

  // Subjects management states
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Schools management states
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Grades management states
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradesLoading, setGradesLoading] = useState(false);

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
      setGrowthData(null); // Reset data when selections change
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-8">
          <div className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'students'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">STUDENTS</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'questions'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <FileQuestion className="h-4 w-4" />
                <span className="hidden sm:inline">QUESTIONS</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'growth'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">GROWTH</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'subjects'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">SUBJECTS</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('schools')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'schools'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">SCHOOLS</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'grades'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">GRADES</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('configs')}
              className={`flex-1 min-w-0 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'configs'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">CONFIGS</span>
              </div>
            </button>
          </div>
        </div>

        {/* Questions Management Tab Content */}
        {activeTab === 'questions' && (
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
        )}

        {/* Student Growth Tab Content */}
        {activeTab === 'growth' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Selection Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>Subject</span>
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
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  <span>Student</span>
                </h2>
                <div className="space-y-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                        selectedStudent === student.id
                          ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-200'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-medium">
                        {student.firstName && student.lastName 
                          ? `${student.firstName} ${student.lastName}`
                          : student.username
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.username}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Growth Chart Content */}
            <div className="lg:col-span-3">
              {selectedSubject && selectedStudent ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Student Growth Analysis
                    </h2>
                    <p className="text-gray-600">
                      {students.find(s => s.id === selectedStudent)?.firstName || 'Student'} - {selectedSubject.name}
                    </p>
                  </div>

                  {growthLoading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    </div>
                  ) : growthData ? (
                    <GrowthOverTimeChart data={growthData} />
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                      <div className="text-center">
                        <p className="text-gray-600">Select a subject and student to view growth data.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                  <div className="text-center">
                    <p className="text-gray-600">Please select both a subject and a student to view growth analysis.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Management Tab Content */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <StudentList />
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

        {/* Schools Management Tab Content */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            <SchoolList />
          </div>
        )}

        {/* Grades Management Tab Content */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            <GradeList />
          </div>
        )}

        {/* Assessment Configurations Tab Content */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            <AssessmentConfigList />
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