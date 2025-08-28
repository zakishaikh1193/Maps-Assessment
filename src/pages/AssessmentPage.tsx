import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { AssessmentQuestion, AssessmentResponse } from '../types';
import Navigation from '../components/Navigation';
import { Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

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
      const response = await studentAPI.startAssessment(subjectId, period as 'Fall' | 'Winter' | 'Spring');
      setAssessmentId(response.assessmentId);
      setCurrentQuestion(response.question);
      setStartTime(Date.now());
      
      // Extract time limit and question count from the first question
      if (response.question) {
        setTotalQuestions(response.question.totalQuestions);
        setCurrentQuestionNumber(response.question.questionNumber);
        // Time limit will be set from backend configuration
        // For now, we'll use a default or extract from response if available
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

      // Show feedback
      setFeedback({ isCorrect: response.isCorrect, show: true });

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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Error</h1>
            <p className="text-gray-600">Unable to load assessment questions.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{period} Assessment</h1>
              <p className="text-gray-600">Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}</p>
              <p className="text-sm text-blue-600 font-medium">MAP Adaptive Testing</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className="font-mono">{getTimeDisplay()}</span>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQuestion.questionNumber / currentQuestion.totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Warning Alert */}
        {showTimeWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
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

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                } ${feedback.show ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={submitAnswer}
              disabled={selectedAnswer === null || submitting || feedback.show}
              className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            💡 <strong>MAP Adaptive Testing:</strong> This assessment adapts to your performance. 
            Answer correctly to get harder questions, incorrectly for easier ones. 
            Your RIT score is based on the highest difficulty level you answer correctly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;