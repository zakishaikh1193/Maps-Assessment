import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Subject } from '../types';
import { subjectsAPI } from '../services/api';
import Navigation from '../components/Navigation';
import { Trophy, Target, Clock, CheckCircle, ArrowRight, Star } from 'lucide-react';

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  
  const { 
    ritScore, 
    correctAnswers, 
    totalQuestions, 
    duration, 
    subjectId, 
    period,
    message
  } = location.state as {
    ritScore: number;
    correctAnswers: number;
    totalQuestions: number;
    duration: number;
    subjectId: number;
    period: string;
    message?: string;
  };

  useEffect(() => {
    loadSubject();
  }, []);

  const loadSubject = async () => {
    try {
      const subjectData = await subjectsAPI.getById(subjectId);
      setSubject(subjectData);
    } catch (error) {
      console.error('Failed to load subject:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 300) return 'text-purple-600';
    if (score >= 250) return 'text-blue-600';
    if (score >= 200) return 'text-emerald-600';
    if (score >= 150) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 300) return 'Advanced+';
    if (score >= 250) return 'Advanced';
    if (score >= 200) return 'Proficient';
    if (score >= 150) return 'Developing';
    return 'Beginning';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 300) return '🏆';
    if (score >= 250) return '🌟';
    if (score >= 200) return '🎯';
    if (score >= 150) return '📈';
    return '🌱';
  };

  const accuracyPercentage = Math.round((correctAnswers / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreIcon(ritScore)}</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-xl text-gray-600">
            {subject?.name} • {period} Assessment
          </p>
          {message && (
            <p className="text-lg text-blue-600 font-medium mt-2">{message}</p>
          )}
        </div>

        {/* Main Score Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className={`text-6xl font-bold ${getScoreColor(ritScore)} mb-2`}>
                {ritScore}
              </div>
              <div className="text-xl text-gray-600">RIT Score</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                ritScore >= 300 ? 'bg-purple-100 text-purple-800' :
                ritScore >= 250 ? 'bg-blue-100 text-blue-800' :
                ritScore >= 200 ? 'bg-emerald-100 text-emerald-800' :
                ritScore >= 150 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getScoreLevel(ritScore)} Level
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-900">{correctAnswers}</div>
                  <div className="text-sm text-emerald-700">Correct Answers</div>
                </div>
              </div>
              <div className="text-emerald-800">
                <div className="text-lg font-semibold">{accuracyPercentage}% Accuracy</div>
                <div className="text-sm">out of {totalQuestions} questions</div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{finalScore}</div>
                  <div className="text-sm text-blue-700">Adaptive Score</div>
                </div>
              </div>
              <div className="text-blue-800">
                <div className="text-lg font-semibold">Skill Level</div>
                <div className="text-sm">{getScoreLevel(finalScore)}</div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">{duration}</div>
                  <div className="text-sm text-purple-700">Minutes</div>
                </div>
              </div>
              <div className="text-purple-800">
                <div className="text-lg font-semibold">Time Taken</div>
                <div className="text-sm">~{Math.round(duration / totalQuestions * 10) / 10} min/question</div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Interpretation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Star className="h-5 w-5 text-blue-600" />
            <span>Understanding Your Score</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Adaptive Assessment</h4>
              <p className="text-gray-600 text-sm">
                Your score is based on the difficulty level of questions you answered. 
                The system adapts by giving you harder questions when you answer correctly 
                and easier questions when you answer incorrectly.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Score Ranges</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-600">Advanced:</span>
                  <span>250-300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600">Proficient:</span>
                  <span>200-249</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">Developing:</span>
                  <span>150-199</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">Beginning:</span>
                  <span>100-149</span>
                </div>
              </div>
            </div>
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
            {accuracyPercentage >= 80 
              ? "Excellent work! You're showing strong mastery of the material." 
              : accuracyPercentage >= 60
              ? "Good effort! Keep practicing to improve your skills."
              : "Every assessment is a learning opportunity. Keep working hard!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;