import React from 'react';
import { Users } from 'lucide-react';
import { WeeklyQuizConfig, QuizState, getTokenReward, formatTokens } from '@/utils/quizSchedule';

interface WeeklyQuizCardProps {
  state: QuizState;
  config: WeeklyQuizConfig;
  countdown: string;
  onStartQuiz: () => void;
  userCompleted: boolean;
  participantCount?: number;
  userScore?: number;
  userRank?: number;
}

export function WeeklyQuizCard({
  state,
  config,
  countdown,
  onStartQuiz,
  userCompleted,
  participantCount,
  userScore,
  userRank
}: WeeklyQuizCardProps) {
  if (state === 'upcoming') {
    return <UpcomingQuizView config={config} countdown={countdown} />;
  }
  
  if (state === 'live') {
    return (
      <LiveQuizView
        config={config}
        countdown={countdown}
        onStartQuiz={onStartQuiz}
        userCompleted={userCompleted}
        participantCount={participantCount}
        userScore={userScore}
        userRank={userRank}
      />
    );
  }
  
  return <EndedQuizView config={config} countdown={countdown} />;
}

// UPCOMING STATE VIEW
function UpcomingQuizView({ config, countdown }: { config: WeeklyQuizConfig; countdown: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">📅 Next Quiz</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.topic}</h2>
        <div className="text-lg text-blue-600 font-semibold mb-4">{countdown}</div>
      </div>

      <div className="text-gray-700 space-y-3 mb-6 text-left">
        <div className="flex items-center space-x-2">
          <span className="text-blue-500">📋</span>
          <span><strong>10 questions</strong> • 45 seconds each</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-green-500">⏱️</span>
          <span><strong>10 seconds</strong> between questions</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-purple-500">🏆</span>
          <span><strong>15M QT tokens</strong> for top 10</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-orange-500">⏰</span>
          <span><strong>12-hour window</strong> to participate</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-2">💰 Token Rewards</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div className="flex justify-between">
            <span>🥇 1st Place:</span>
            <span className="font-semibold">4M QT</span>
          </div>
          <div className="flex justify-between">
            <span>🥈 2nd Place:</span>
            <span className="font-semibold">2.5M QT</span>
          </div>
          <div className="flex justify-between">
            <span>🥉 3rd Place:</span>
            <span className="font-semibold">1.5M QT</span>
          </div>
          <div className="flex justify-between">
            <span>4th-10th:</span>
            <span className="font-semibold">1M QT each</span>
          </div>
        </div>
      </div>

      <button
        disabled
        className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
      >
        Quiz Starts in {countdown}
      </button>
    </div>
  );
}

// LIVE STATE VIEW
function LiveQuizView({
  config,
  countdown,
  onStartQuiz,
  userCompleted,
  participantCount,
  userScore,
  userRank
}: {
  config: WeeklyQuizConfig;
  countdown: string;
  onStartQuiz: () => void;
  userCompleted: boolean;
  participantCount?: number;
  userScore?: number;
  userRank?: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse mr-2">
            🔴 LIVE NOW
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.topic}</h2>
        <div className="text-lg text-red-600 font-semibold mb-4">Ends in {countdown}</div>
      </div>

      {participantCount && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center space-x-2 text-blue-700">
            <Users size={16} />
            <span className="font-semibold">{participantCount} participants so far</span>
          </div>
        </div>
      )}

      {userCompleted ? (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-green-600 font-bold text-lg mb-2">✅ Quiz Completed!</div>
            <div className="text-gray-700">
              <div>Your Score: <span className="font-bold">{userScore}/10</span></div>
              {userRank && (
                <div>Your Rank: <span className="font-bold">#{userRank}</span></div>
              )}
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/leaderboard'}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all"
          >
            View Leaderboard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-gray-700 space-y-2 mb-6 text-left">
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">📋</span>
              <span><strong>10 questions</strong> • 45 seconds each</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">⏱️</span>
              <span><strong>10 seconds</strong> between questions</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-500">🏆</span>
              <span><strong>15M QT tokens</strong> for top 10</span>
            </div>
          </div>

          <button
            onClick={onStartQuiz}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg animate-pulse"
          >
            🚀 START QUIZ NOW
          </button>
        </div>
      )}
    </div>
  );
}

// ENDED STATE VIEW
function EndedQuizView({ config, countdown }: { config: WeeklyQuizConfig; countdown: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">⏹️ Quiz Ended</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{config.topic}</h2>
        <div className="text-lg text-gray-600 mb-4">This quiz has ended</div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-800 mb-3">🏆 Top 3 Winners Preview</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <span>🥇</span>
              <span>1st Place</span>
            </span>
            <span className="font-semibold text-yellow-600">{formatTokens(getTokenReward(1))} QT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <span>🥈</span>
              <span>2nd Place</span>
            </span>
            <span className="font-semibold text-gray-600">{formatTokens(getTokenReward(2))} QT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <span>🥉</span>
              <span>3rd Place</span>
            </span>
            <span className="font-semibold text-orange-600">{formatTokens(getTokenReward(3))} QT</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => window.location.href = '/leaderboard'}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all"
        >
          View Full Leaderboard
        </button>
        
        <div className="text-sm text-gray-500">
          Next Quiz starts in: <span className="font-semibold">{countdown}</span>
        </div>
      </div>
    </div>
  );
}
