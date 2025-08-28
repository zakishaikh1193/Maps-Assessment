import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, BarChart3, Sparkles } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <nav className={`shadow-2xl border-b-4 ${
      isAdmin 
        ? 'bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-purple-500' 
        : 'bg-white border-blue-500'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isAdmin ? (
                <div className="relative">
                  <Shield className="h-8 w-8 text-purple-400" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
                </div>
              ) : (
                <BarChart3 className="h-8 w-8 text-blue-600" />
              )}
              <h1 className={`text-xl font-bold ${
                isAdmin ? 'text-white' : 'text-gray-900'
              }`}>
                MAP Assessment
              </h1>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              isAdmin 
                ? 'text-purple-200 bg-purple-500/20 border border-purple-400/30' 
                : 'text-gray-500 bg-gray-100'
            }`}>
              {isAdmin ? '🛡️ Administrator' : '👨‍🎓 Student'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              isAdmin ? 'text-white' : 'text-gray-700'
            }`}>
              <User className="h-5 w-5" />
              <span className="font-medium">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isAdmin 
                  ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-400/30' 
                  : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
              }`}
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