import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { AssessmentQuestion, AssessmentResponse, StartAssessmentResponse } from '../types';
import Navigation from '../components/Navigation';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  AlertTriangle,
  Brain,
  Target,
  Timer,
  BookOpen,
  User,
  Building,
  GraduationCap
} from 'lucide-react';

const AssessmentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectId, period } = location.state as { subjectId: number; period: string };

  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [assessmentId, setAssessmentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect?: boolean; show: boolean }>({ show: false });
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeLimit, setTimeLimit] = useState<number>(30); // Default 30 minutes
  const [totalQuestions, setTotalQuestions] = useState<number>(10); // Default 10 questions
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit * 60); // Convert to seconds
  const [showTimeWarning, setShowTimeWarning] = useState<boolean>(false);
  const [showCriticalWarning, setShowCriticalWarning] = useState<boolean>(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    const initAssessment = async () => {
      await startAssessment();
    };
    
    initAssessment();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!loading && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Show critical warning when 2 minutes remaining
          if (newTime === 120) { // 2 minutes = 120 seconds
            setShowCriticalWarning(true);
          }
          
          // Show warning when 5 minutes remaining
          if (newTime === 300) { // 5 minutes = 300 seconds
            setShowTimeWarning(true);
          }
          
          // Auto-submit when time runs out
          if (newTime <= 0) {
            clearInterval(timer);
            // Auto-submit current answer if one is selected
            if (selectedAnswer !== null && currentQuestion && assessmentId) {
              submitAnswer();
            }
            return 0;
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, timeRemaining, selectedAnswer, currentQuestion, assessmentId]);

  const startAssessment = async () => {
    try {
      const response: StartAssessmentResponse = await studentAPI.startAssessment(subjectId, period);
      setAssessmentId(response.assessmentId);
      setCurrentQuestion(response.question);
      setStartTime(Date.now());
      
      // Extract time limit and question count from the response
      if (response.question) {
        setTotalQuestions(response.question.totalQuestions);
        setCurrentQuestionNumber(response.question.questionNumber);
      }
      
      // Set time limit from backend configuration
      if (response.timeLimitMinutes) {
        setTimeLimit(response.timeLimitMinutes);
        setTimeRemaining(response.timeLimitMinutes * 60); // Convert to seconds
      }
    } catch (error: any) {
      console.error('Failed to start assessment:', error);
      alert(error.response?.data?.error || 'Failed to start assessment');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || assessmentId === null) return;

    setSubmitting(true);
    try {
      const response: AssessmentResponse = await studentAPI.submitAnswer(
        currentQuestion.id,
        selectedAnswer,
        assessmentId
      );

      // Mark current question as answered
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.questionNumber]));

      // Show feedback (ensure we show the actual correctness for this submission)
      setFeedback({ isCorrect: response.isCorrect === true, show: true });

      // Wait for feedback display, then continue
      setTimeout(async () => {
        if (response.completed && response.assessmentId) {
          try {
            // Fetch detailed results
            const detailedResults = await studentAPI.getDetailedResults(response.assessmentId);
            navigate('/results', { 
              state: { 
                ...detailedResults,
                subjectId,
                period
              }
            });
          } catch (error) {
            console.error('Failed to fetch detailed results:', error);
          }
        } else if (response.question) {
          setCurrentQuestion(response.question);
          setCurrentQuestionNumber(response.question.questionNumber);
          setSelectedAnswer(null);
          setFeedback({ show: false });
        }
      }, 1500);
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      alert(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeDisplay = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeProgress = () => {
    const totalTime = timeLimit * 60; // Convert to seconds
    const elapsed = totalTime - timeRemaining;
    return (elapsed / totalTime) * 100;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 120) return 'text-red-600'; // Critical
    if (timeRemaining <= 300) return 'text-yellow-600'; // Warning
    return 'text-gray-600'; // Normal
  };

  const getCircularProgressColor = () => {
    if (timeRemaining <= 120) return 'stroke-red-500'; // Critical
    if (timeRemaining <= 300) return 'stroke-yellow-500'; // Warning
    return 'stroke-yellow-500'; // Normal
  };

  const getCircularProgressBgColor = () => {
    if (timeRemaining <= 120) return 'stroke-red-100'; // Critical
    if (timeRemaining <= 300) return 'stroke-yellow-100'; // Warning
    return 'stroke-gray-100'; // Normal
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Preparing your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Error</h1>
            <p className="text-gray-600">Unable to load assessment questions.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-pink-50">
      <Navigation />
      
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Modern Header with Student Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{period} Assessment</h1>
                    <p className="text-gray-600">Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Student Info */}
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>Saudi International School</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GraduationCap className="h-4 w-4" />
                    <span>Grade 6</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Student1 Grade6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Time Warning */}
          {showCriticalWarning && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Critical Time Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Less than 2 minutes remaining! Please submit your answer quickly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time Warning Alert */}
          {showTimeWarning && !showCriticalWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-yellow-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Time Warning</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have less than 5 minutes remaining. Please complete your assessment soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Question Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
            {feedback.show && (
              <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${
                feedback.isCorrect 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {feedback.isCorrect ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
                <span className="font-medium">
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 leading-relaxed">
                {currentQuestion.text}
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !feedback.show && setSelectedAnswer(index)}
                  disabled={feedback.show}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedAnswer === index
                      ? 'border-yellow-500 bg-yellow-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 hover:shadow-sm'
                  } ${feedback.show ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                      selectedAnswer === index
                        ? 'border-yellow-500 bg-yellow-500 text-white'
                        : 'border-gray-300 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-gray-900 font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={submitAnswer}
                disabled={selectedAnswer === null || submitting || feedback.show}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-yellow-500 to-pink-500 text-white rounded-xl hover:from-yellow-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-2">MAP Adaptive Testing</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  This assessment adapts to your performance in real-time. Answer correctly to receive more challenging questions, 
                  or answer incorrectly for easier ones. Your final RIT score is calculated as the average difficulty of all questions you attempted.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-6">
            {/* Circular Timer */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col items-center">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className={`${getCircularProgressBgColor()} text-gray-200`}
                    />
                    {/* Progress circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - getTimeProgress() / 100)}`}
                      className={`${getCircularProgressColor()} transition-all duration-300`}
                    />
                  </svg>
                  
                  {/* Time Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-2xl font-bold font-mono ${getTimeColor()}`}>
                      {getTimeDisplay()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Time Remaining</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Navigation</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Array.from({ length: totalQuestions }, (_, index) => {
                  const questionNum = index + 1;
                  const isCurrent = questionNum === currentQuestionNumber;
                  const isAnswered = answeredQuestions.has(questionNum);
                  
                  return (
                    <button
                      key={questionNum}
                      disabled={true} // Disable navigation for now as it's adaptive
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                        isCurrent
                          ? 'bg-yellow-100 border-2 border-yellow-500 text-yellow-800'
                          : isAnswered
                          ? 'bg-green-100 border border-green-300 text-green-800'
                          : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                      } ${isCurrent ? 'cursor-default' : 'cursor-not-allowed'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Question {questionNum}</span>
                        {isCurrent && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        )}
                        {isAnswered && !isCurrent && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span>Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;