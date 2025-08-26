import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject, DashboardData } from '../types';
import { subjectsAPI, studentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import GrowthChart from '../components/GrowthChart';
import { Play, Trophy, Calendar, BookOpen, TrendingUp } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get current season based on date
  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 8 && month <= 10) return 'Fall';
    if (month >= 11 || month <= 1) return 'Winter';
    return 'Spring';
  };

  const currentSeason = getCurrentSeason();
  const periods = [currentSeason] as const;

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [subjectsData, assessmentData] = await Promise.all([
        subjectsAPI.getAll(),
        studentAPI.getDashboardData()
      ]);
      setSubjects(subjectsData);
      setDashboardData(assessmentData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = (subjectId: number, period: string) => {
    navigate('/assessment', { 
      state: { subjectId, period } 
    });
  };

  const getCompletedAssessments = (subjectId: number) => {
    const subjectData = dashboardData.find(data => data.subjectId === subjectId);
    return subjectData?.assessments || [];
  };

  const isAssessmentCompleted = (subjectId: number, period: string) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    return completedAssessments.some(assessment => assessment.assessmentPeriod === period);
  };

  const getLatestRITScore = (subjectId: number) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    if (completedAssessments.length === 0) return null;
    
    const latest = completedAssessments.reduce((latest, current) => {
      return new Date(current.dateTaken) > new Date(latest.dateTaken) ? current : latest;
    });
    
    return latest.ritScore;
  };

  const getAverageRITScore = (subjectId: number) => {
    const completedAssessments = getCompletedAssessments(subjectId);
    if (completedAssessments.length === 0) return null;
    
    const totalScore = completedAssessments.reduce((sum, assessment) => sum + (assessment.ritScore || 0), 0);
    return Math.round(totalScore / completedAssessments.length);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          <p className="text-gray-600">
            Track your academic progress and take {currentSeason} assessments
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
                <p className="text-gray-600">Available Subjects</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Trophy className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.reduce((total, subject) => total + subject.assessments.length, 0)}
                </p>
                <p className="text-gray-600">Assessments Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    dashboardData.reduce((total, subject) => {
                      const avg = getAverageRITScore(subject.subjectId);
                      return total + (avg || 0);
                    }, 0) / Math.max(dashboardData.length, 1)
                  ) || 'N/A'}
                </p>
                <p className="text-gray-600">Average RIT Score</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subjects and Assessments */}
          <div className="lg:col-span-2 space-y-6">
            {subjects.map((subject) => {
              const completedAssessments = getCompletedAssessments(subject.id);
              const latestRITScore = getLatestRITScore(subject.id);
              const averageRITScore = getAverageRITScore(subject.id);

              return (
                <div key={subject.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{subject.name}</h3>
                        <p className="text-gray-600">{subject.description}</p>
                      </div>
                      {latestRITScore && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{latestRITScore}</div>
                          <div className="text-sm text-gray-600">Latest RIT Score</div>
                          {averageRITScore && (
                            <div className="text-sm text-gray-500">Avg: {averageRITScore}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {periods.map((period) => {
                        const isCompleted = isAssessmentCompleted(subject.id, period);
                        const assessment = completedAssessments.find(a => a.assessmentPeriod === period);

                        return (
                          <div key={period} className="text-center">
                            <div className="mb-2">
                              <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                              <div className="text-sm font-medium text-gray-700">{period}</div>
                            </div>
                            {isCompleted ? (
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-emerald-600">
                                  {assessment?.ritScore}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {assessment?.correctAnswers}/10 correct
                                </div>
                                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Completed
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startAssessment(subject.id, period)}
                                className="flex items-center justify-center space-x-1 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Play className="h-4 w-4" />
                                <span>Start</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Show current season status */}
                  <div className="p-4 bg-gray-50">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {currentSeason} Assessment Status
                      </div>
                      {completedAssessments.length > 0 ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          ✓ Completed
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          Available
                        </div>
                      )}
                    </div>
                    
                    {/* Growth Chart Button */}
                    {getCompletedAssessments(subject.id).length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => navigate(`/growth/${subject.id}`)}
                          className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          View Growth Chart
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Season Progress</h3>
              <div className="space-y-4">
                {subjects.map((subject) => {
                  const completedCount = getCompletedAssessments(subject.id).length;
                  const progressPercentage = completedCount > 0 ? 100 : 0;

                  return (
                    <div key={subject.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                        <span className="text-sm text-gray-600">{completedCount}/1</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {dashboardData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scores</h3>
                <div className="space-y-3">
                  {dashboardData
                    .flatMap(subject => 
                      subject.assessments.map(assessment => ({
                        ...assessment,
                        subjectName: subject.subjectName
                      }))
                    )
                    .sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime())
                    .slice(0, 5)
                    .map((assessment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{assessment.subjectName}</div>
                          <div className="text-sm text-gray-600">
                            {assessment.assessmentPeriod} • {new Date(assessment.dateTaken).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">{assessment.ritScore}</div>
                          <div className="text-xs text-gray-500">{assessment.correctAnswers}/10</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;