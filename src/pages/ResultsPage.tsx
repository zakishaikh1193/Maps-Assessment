import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DetailedAssessmentResults, AssessmentResult } from '../types';
import Navigation from '../components/Navigation';
import DifficultyProgressionChart from '../components/DifficultyProgressionChart';
import GrowthOverTimeChart from '../components/GrowthOverTimeChart';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  BookOpen,
  BarChart3,
  BarChart,
  LineChart
} from 'lucide-react';

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState<DetailedAssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assessment' | 'overall'>('assessment');
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);

  useEffect(() => {
    // Check if we have detailed results or basic results
    if (location.state?.statistics) {
      // We have detailed results
      setResults(location.state as DetailedAssessmentResults);
      setLoading(false);
    } else {
      // We have basic results, show fallback
      setLoading(false);
    }
  }, [location.state]);

  // Fetch growth data when switching to overall tab
  useEffect(() => {
    if (activeTab === 'overall' && results && !growthData && !growthLoading) {
      setGrowthLoading(true);
      // Import the API function dynamically to avoid circular dependencies
      import('../services/api').then(({ studentAPI }) => {
        // We need to get the subject ID from the assessment ID
        // For now, we'll use a default subject ID (4 for Computer Science)
        // In a real app, you'd get this from the assessment details
        const subjectId = 4; // Default to Computer Science
        studentAPI.getGrowthOverTime(subjectId)
          .then(data => {
            setGrowthData(data);
            setGrowthLoading(false);
          })
          .catch(error => {
            console.error('Error fetching growth data:', error);
            setGrowthLoading(false);
          });
      });
    }
  }, [activeTab, results, growthData, growthLoading]);

  const getScoreColor = (score: number) => {
    if (score >= 350) return 'text-purple-600';
    if (score >= 300) return 'text-blue-600';
    if (score >= 250) return 'text-emerald-600';
    if (score >= 200) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 350) return 'Advanced+';
    if (score >= 300) return 'Advanced';
    if (score >= 250) return 'Proficient';
    if (score >= 200) return 'Developing';
    return 'Beginning';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 350) return '🏆';
    if (score >= 300) return '🌟';
    if (score >= 250) return '🎯';
    if (score >= 200) return '📈';
    return '🌱';
  };

  const getRITChange = () => {
    if (!results?.statistics.previousRIT) return null;
    const change = results.statistics.currentRIT - results.statistics.previousRIT;
    return {
      value: change,
      isPositive: change > 0,
      percentage: Math.round((change / results.statistics.previousRIT) * 100)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!results) {
    // Fallback for basic results
    const basicResults = location.state as {
      ritScore: number;
      correctAnswers: number;
      totalQuestions: number;
      duration: number;
      subjectId: number;
      period: string;
      message?: string;
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{getScoreIcon(basicResults.ritScore)}</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
            <p className="text-xl text-gray-600 mb-4">
              {basicResults.message}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold ${getScoreColor(basicResults.ritScore)} mb-2`}>
                {basicResults.ritScore}
              </div>
              <div className="text-xl text-gray-600">RIT Score</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">{basicResults.correctAnswers}</div>
                <div className="text-sm text-emerald-700">Correct Answers</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{basicResults.totalQuestions}</div>
                <div className="text-sm text-blue-700">Total Questions</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{basicResults.duration}</div>
                <div className="text-sm text-purple-700">Minutes</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ritChange = getRITChange();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreIcon(results.statistics.currentRIT)}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-xl text-gray-600">
            {results.assessment.subjectName} • {results.assessment.period} {results.assessment.year}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-8">
          <div className="flex">
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'assessment'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart className="h-4 w-4" />
                <span>ASSESSMENT REPORT</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'overall'
                  ? 'bg-purple-100 text-purple-800 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <LineChart className="h-4 w-4" />
                <span>OVERALL REPORT</span>
              </div>
            </button>
          </div>
        </div>

        {/* Assessment Report Tab Content */}
        {activeTab === 'assessment' && (
          <>
            {/* Main Score Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className={`text-6xl font-bold ${getScoreColor(results.statistics.currentRIT)} mb-2`}>
                {results.statistics.currentRIT}
              </div>
              <div className="text-xl text-gray-600">Current RIT Score</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                results.statistics.currentRIT >= 350 ? 'bg-purple-100 text-purple-800' :
                results.statistics.currentRIT >= 300 ? 'bg-blue-100 text-blue-800' :
                results.statistics.currentRIT >= 250 ? 'bg-emerald-100 text-emerald-800' :
                results.statistics.currentRIT >= 200 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getScoreLevel(results.statistics.currentRIT)} Level
              </div>
            </div>

            {/* RIT Change Indicator */}
            {ritChange && (
              <div className="mt-4">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                  ritChange.isPositive 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ritChange.isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {ritChange.isPositive ? '+' : ''}{ritChange.value} points 
                    ({ritChange.isPositive ? '+' : ''}{ritChange.percentage}%)
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  from previous assessment
                </div>
              </div>
            )}
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-900">{results.statistics.correctAnswers}</div>
                  <div className="text-sm text-emerald-700">Correct</div>
                </div>
              </div>
              <div className="text-emerald-800">
                <div className="text-lg font-semibold">{results.statistics.accuracy}% Accuracy</div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-xl border border-red-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-900">{results.statistics.incorrectAnswers}</div>
                  <div className="text-sm text-red-700">Incorrect</div>
                </div>
              </div>
              <div className="text-red-800">
                <div className="text-lg font-semibold">Need Improvement</div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{results.statistics.totalQuestions}</div>
                  <div className="text-sm text-blue-700">Total Questions</div>
                </div>
              </div>
              <div className="text-blue-800">
                <div className="text-lg font-semibold">Adaptive Test</div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{results.assessment.duration}</div>
                  <div className="text-sm text-purple-700">Minutes</div>
                </div>
              </div>
              <div className="text-purple-800">
                <div className="text-lg font-semibold">Time Taken</div>
                <div className="text-sm">~{Math.round(results.assessment.duration / results.statistics.totalQuestions * 10) / 10} min/question</div>
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty Progression Chart */}
        <div className="mb-8">
          <DifficultyProgressionChart
            data={results.difficultyProgression}
            currentRIT={results.statistics.currentRIT}
            previousRIT={results.statistics.previousRIT}
          />
        </div>

        {/* Previous Assessment Comparison */}
        {results.previousAssessment && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Progress Comparison</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Previous Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RIT Score:</span>
                    <span className="font-medium">{results.previousAssessment.ritScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{results.previousAssessment.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{results.previousAssessment.year}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Current Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">RIT Score:</span>
                    <span className="font-medium">{results.statistics.currentRIT}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">{results.assessment.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{results.assessment.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span>Question Analysis</span>
          </h3>
          <div className="space-y-4">
            {results.responses.map((response, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                response.isCorrect 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      response.isCorrect 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {response.questionNumber}
                    </div>
                    <div className="flex items-center space-x-2">
                      {response.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {response.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Difficulty: {response.difficulty}
                  </div>
                </div>
                <div className="text-gray-900 mb-3">{response.questionText}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Your Answer: </span>
                    <span className={response.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {response.options[response.selectedAnswer]}
                    </span>
                  </div>
                  {!response.isCorrect && (
                    <div>
                      <span className="font-medium text-gray-700">Correct Answer: </span>
                      <span className="text-emerald-600">
                        {response.options[response.correctAnswer]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <span>View Progress Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Motivational Message */}
        <div className="mt-8 text-center p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl border border-blue-200">
          <p className="text-blue-800 font-medium">
            {results.statistics.accuracy >= 80 
              ? "Excellent work! You're showing strong mastery of the material." 
              : results.statistics.accuracy >= 60
              ? "Good effort! Keep practicing to improve your skills."
              : "Every assessment is a learning opportunity. Keep working hard!"}
          </p>
          {ritChange && (
            <p className="text-blue-700 text-sm mt-2">
              {ritChange.isPositive 
                ? "Great progress! You've improved since your last assessment."
                : "Don't worry! Focus on the areas that need improvement."}
            </p>
          )}
        </div>
          </>
        )}

        {/* Overall Report Tab Content */}
        {activeTab === 'overall' && (
          <div className="space-y-8">
            {growthLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </div>
            ) : growthData ? (
              <>
                {/* Growth Chart */}
                <GrowthOverTimeChart data={growthData} />
                
                {/* Difficulty Progression Chart */}
                <DifficultyProgressionChart
                  data={results.difficultyProgression}
                  currentRIT={results.statistics.currentRIT}
                  previousRIT={results.statistics.previousRIT}
                />
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center">
                  <p className="text-gray-600">Unable to load growth data.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;