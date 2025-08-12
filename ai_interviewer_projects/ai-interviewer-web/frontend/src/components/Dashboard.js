import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { interviewAPI } from '../services/api';
import { 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  BookOpen,
  Play,
  History,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentInterviews();
  }, []);

  const fetchRecentInterviews = async () => {
    try {
      const response = await interviewAPI.getUserInterviews();
      setRecentInterviews(response.data.interviews.slice(0, 5)); // Get last 5 interviews
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load recent interviews');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const quickActions = [
    {
      title: 'Start New Interview',
      description: 'Begin a practice interview with Gwen',
      icon: Play,
      href: '/interview',
      color: 'bg-primary-500 hover:bg-primary-600',
      textColor: 'text-white'
    },
    {
      title: 'View History',
      description: 'Review your past interviews and progress',
      icon: History,
      href: '/history',
      color: 'bg-secondary-500 hover:bg-secondary-600',
      textColor: 'text-white'
    }
  ];

  const stats = [
    {
      title: 'Total Interviews',
      value: recentInterviews.length,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      title: 'Completed',
      value: recentInterviews.filter(i => i.status === 'completed').length,
      icon: Award,
      color: 'text-green-600'
    },
    {
      title: 'In Progress',
      value: recentInterviews.filter(i => i.status === 'in_progress').length,
      icon: Clock,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="interview-container">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.full_name || user?.username}! 👋
        </h1>
        <p className="text-gray-600">
          Ready to practice your interview skills with Gwen? Let's get started!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.href}
                className="card hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${action.color} ${action.textColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Interviews */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Interviews</h2>
          <Link
            to="/history"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </Link>
        </div>
        
        {loading ? (
          <div className="card">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : recentInterviews.length > 0 ? (
          <div className="space-y-4">
            {recentInterviews.map((interview) => (
              <div key={interview.session_id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {interview.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(interview.start_time).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                      {interview.status.replace('_', ' ')}
                    </span>
                    <Link
                      to={`/interview/${interview.session_id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews yet</h3>
            <p className="text-gray-600 mb-4">
              Start your first interview to begin practicing with Gwen
            </p>
            <Link to="/interview" className="btn-primary">
              Start Your First Interview
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
