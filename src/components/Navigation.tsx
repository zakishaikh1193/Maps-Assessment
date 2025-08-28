import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, BookOpen, BarChart3 } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow-lg border-b-4 border-blue-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">MAP Assessment</h1>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {user.role === 'admin' ? 'Administrator' : 'Student'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* School and Grade Info for Students */}
            {user.role === 'student' && user.school && user.grade && (
              <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{user.school.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>{user.grade.display_name}</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-gray-700">
              <User className="h-5 w-5" />
              <span className="font-medium">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;