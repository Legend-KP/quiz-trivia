import React from 'react';
import { Clock, Trophy, Users, Calendar, ExternalLink } from 'lucide-react';
import { WeeklyQuizConfig, QuizState, getTokenReward, formatTokens } from '~/lib/weeklyQuiz';
import { useCountdown, useQuizState } from '~/hooks/useWeeklyQuiz';

interface WeeklyQuizCardProps {
  config: WeeklyQuizConfig;
  onStartQuiz: () => void;
  userCompleted?: boolean;
  participantCount?: number;
  className?: string;
}

// Upcoming Quiz View
const UpcomingQuizView: React.FC<WeeklyQuizCardProps & { countdown: string }> = ({ 
  config, 
  countdown, 
  participantCount 
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl border-2 border-blue-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <Calendar className="text-blue-500 mr-2" size={24} />
          <h3 className="text-2xl font-bold text-gray-800">Weekly Quiz Challenge</h3>
        </div>
        <div className="text-lg font-semibold text-blue-600 mb-2">{config.topic}</div>
        <div className="text-sm text-gray-600">Next Quiz Topic</div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-semibold">⏰ Starts In:</span>
            <span className="text-blue-600 font-bold text-lg">{countdown}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-semibold text-gray-800">📋 Questions</div>
            <div className="text-gray-600">10 questions</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-semibold text-gray-800">⏱️ Time</div>
            <div className="text-gray-600">45s each</div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center mb-2">
          <Trophy className="text-yellow-600 mr-2" size={20} />
          <span className="font-semibold text-yellow-800">🏆 Token Rewards</span>
        </div>
        <div className="text-sm text-yellow-700">
          <div>🥇 1st Place: {formatTokens(getTokenReward(1))} QT</div>
          <div>🥈 2nd Place: {formatTokens(getTokenReward(2))} QT</div>
          <div>🥉 3rd Place: {formatTokens(getTokenReward(3))} QT</div>
          <div>4th-10th: {formatTokens(getTokenReward(4))} QT each</div>
        </div>
      </div>

      <div className="text-center">
        <button
          disabled
          className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
        >
          Starts in {countdown}
        </button>
      </div>
    </div>
  );
};

// Live Quiz View
const LiveQuizView: React.FC<WeeklyQuizCardProps & { countdown: string }> = ({ 
  config, 
  countdown, 
  onStartQuiz, 
  userCompleted, 
  participantCount 
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl border-2 border-red-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold mr-2 animate-pulse">
            🔴 LIVE NOW
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{config.topic}</h3>
        </div>
        <div className="text-sm text-gray-600">Current Quiz Topic</div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-800 font-semibold">⏰ Ends In:</span>
            <span className="text-red-600 font-bold text-lg">{countdown}</span>
          </div>
        </div>
        
        {participantCount && participantCount > 0 && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <Users className="text-green-600 mr-2" size={20} />
              <span className="text-green-800 font-semibold">{participantCount} participants so far</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-semibold text-gray-800">📋 Questions</div>
            <div className="text-gray-600">10 questions</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-semibold text-gray-800">⏱️ Time</div>
            <div className="text-gray-600">45s each</div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center mb-2">
          <Trophy className="text-yellow-600 mr-2" size={20} />
          <span className="font-semibold text-yellow-800">🏆 Token Rewards</span>
        </div>
        <div className="text-sm text-yellow-700">
          <div>🥇 1st Place: {formatTokens(getTokenReward(1))} QT</div>
          <div>🥈 2nd Place: {formatTokens(getTokenReward(2))} QT</div>
          <div>🥉 3rd Place: {formatTokens(getTokenReward(3))} QT</div>
          <div>4th-10th: {formatTokens(getTokenReward(4))} QT each</div>
        </div>
      </div>

      <div className="text-center">
        {userCompleted ? (
          <button
            disabled
            className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-xl cursor-not-allowed"
          >
            ✅ Completed
          </button>
        ) : (
          <button
            onClick={onStartQuiz}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 animate-pulse"
          >
            🚀 START QUIZ NOW
          </button>
        )}
      </div>
    </div>
  );
};

// Ended Quiz View
const EndedQuizView: React.FC<WeeklyQuizCardProps & { countdown: string }> = ({ 
  config, 
  countdown, 
  participantCount 
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-2xl border-2 border-gray-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-3">
          <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-bold mr-2">
            ⏹️ Quiz Ended
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{config.topic}</h3>
        </div>
        <div className="text-sm text-gray-600">Previous Quiz Topic</div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-center">
            <div className="text-gray-800 font-semibold mb-1">Quiz Closed</div>
            <div className="text-gray-600 text-sm">This quiz closed at 6:00 AM UTC</div>
            {participantCount && (
              <div className="text-gray-600 text-sm mt-1">
                Total participants: {participantCount}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Trophy className="text-yellow-600 mr-2" size={20} />
            <span className="font-semibold text-yellow-800">🏆 Top 3 Winners Preview</span>
          </div>
          <div className="text-sm text-yellow-700">
            <div>🥇 1st Place: {formatTokens(getTokenReward(1))} QT</div>
            <div>🥈 2nd Place: {formatTokens(getTokenReward(2))} QT</div>
            <div>🥉 3rd Place: {formatTokens(getTokenReward(3))} QT</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => window.location.href = '/leaderboard'}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Leaderboard
        </button>
        
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-center">
            <div className="text-blue-800 font-semibold text-sm">Next Quiz</div>
            <div className="text-blue-600 text-sm">{config.topic}</div>
            <div className="text-blue-500 text-xs mt-1">Starts in: {countdown}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main WeeklyQuizCard Component
export const WeeklyQuizCard: React.FC<WeeklyQuizCardProps> = ({
  config,
  onStartQuiz,
  userCompleted = false,
  participantCount,
  className = ""
}) => {
  const quizState = useQuizState(config);
  
  // Get appropriate countdown based on state
  const countdown = React.useMemo(() => {
    if (quizState === 'upcoming') {
      return useCountdown(config.startTime);
    } else if (quizState === 'live') {
      return useCountdown(config.endTime);
    } else {
      // For ended state, show countdown to next quiz
      const nextQuiz = new Date(config.startTime);
      nextQuiz.setDate(nextQuiz.getDate() + (nextQuiz.getDay() === 2 ? 3 : 4)); // Next Tuesday or Friday
      return useCountdown(nextQuiz);
    }
  }, [quizState, config.startTime, config.endTime]);

  const props = {
    config,
    onStartQuiz,
    userCompleted,
    participantCount,
    countdown
  };

  return (
    <div className={className}>
      {quizState === 'upcoming' && <UpcomingQuizView {...props} />}
      {quizState === 'live' && <LiveQuizView {...props} />}
      {quizState === 'ended' && <EndedQuizView {...props} />}
    </div>
  );
};

export default WeeklyQuizCard;
