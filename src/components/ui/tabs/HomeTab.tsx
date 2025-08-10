import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trophy, Star, X } from 'lucide-react';
import { useMiniApp } from '@neynar/react';

// Type definitions
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
  explanation: string;
}

interface Answer {
  questionId: number;
  selectedAnswer: number | null;
  correct: number;
  isCorrect: boolean;
}

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  completedAt: number;
  rank?: number;
}

interface RulesPopupProps {
  onClose: () => void;
}

interface HomePageProps {
  onStartQuiz: () => void;
  onShowRules: () => void;
}

interface QuizPageProps {
  onComplete: (score: number, answers: Answer[], time: string) => void;
  context?: any;
}

interface ResultsPageProps {
  score: number;
  answers: Answer[];
  onRestart: () => void;
  context?: any;
}

// Sample quiz data with explanations
const quizData: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the smallest unit of Ether called?",
    options: ["Gwei", "Satoshi", "Finney", "Wei"],
    correct: 3, // 0-based index for "Wei" (4th option)
    timeLimit: 60, // 5 minutes in seconds
    explanation: "Wei is the smallest denomination of Ether, just like a cent is to a dollar."
  },
  {
    id: 2,
    question: "What does MEV stand for in Ethereum context?",
    options: ["Most Efficient Validator", "Maximum Extractable Value", "Modular Execution Vault", "Minimal Ethereum Value"],
    correct: 1, // 0-based index for "Maximum Extractable Value" (2nd option)
    timeLimit: 60,
    explanation: "MEV refers to profits miners or validators can extract by reordering or censoring transactions."
  },
  {
    id: 3,
    question: "Which Ethereum standard enables tokens to hold other tokens (like NFTs owning NFTs)?",
    options: ["ERC-721", "ERC-20", "ERC-4626", "ERC-998"],
    correct: 3, // 0-based index for "ERC-998" (4th option)
    timeLimit: 60,
    explanation: "ERC-998 is a composable NFT standard allowing NFTs to own both ERC-721 and ERC-20 tokens."
  },
  {
    id: 4,
    question: "What is a blob in the context of Ethereum&apos;s Proto-Danksharding?",
    options: ["A fungible token format", "A zero-knowledge proof", "A temporary data package stored off-chain", "A type of validator node"],
    correct: 2, // 0-based index for "A temporary data package stored off-chain" (3rd option)
    timeLimit: 60,
    explanation: "Blobs are large chunks of data stored off-chain to improve scalability, introduced in EIP-4844 as part of Proto-Danksharding."
  }
];

// Rules Popup Component
const RulesPopup: React.FC<RulesPopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Quiz Trivia Rules 📋
        </h2>
        
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">1️⃣</span>
            <p>The quiz has 4 multiple-choice questions with 30-minute intervals between each question.</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">2️⃣</span>
            <p>You&apos;ll get 5 minutes per question – so think fast! ⏳</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">3️⃣</span>
            <p>Correct answer = +1 point</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">4️⃣</span>
            <p>Wrong answer = -1 point</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">5️⃣</span>
            <p>Most importantly – have fun and learn something new! 🎉</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Let&apos;s Go! 🚀
        </button>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage: React.FC<HomePageProps> = ({ onStartQuiz, onShowRules }) => {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Gradient Background - Full Frame */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-500"></div>
      
      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        


        {/* QUIZ TRIVIA - New Font and Enhanced 3D Effect */}
        <div className="relative mb-12">
          <h3 className="text-5xl md:text-7xl font-black text-yellow-400 uppercase tracking-wider relative" style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            textShadow: '2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6)'
          }}>
            {/* Multiple layers for enhanced 3D effect */}
            <span className="absolute inset-0 transform translate-x-2 translate-y-2 text-yellow-600 opacity-40">QUIZ TRIVIA</span>
            <span className="absolute inset-0 transform translate-x-1 translate-y-1 text-yellow-500 opacity-70">QUIZ TRIVIA</span>
            <span className="relative z-10 drop-shadow-lg">QUIZ TRIVIA</span>
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={onStartQuiz}
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            Start Now 🚀
          </button>
          
          <button
            onClick={onShowRules}
            className="block mx-auto bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            View Rules 📋
          </button>
        </div>

        {/* Enhanced depth styling */}
        <div className="mt-8">
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

// Quiz Component
const QuizPage: React.FC<QuizPageProps> = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quizData[0].timeLimit);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [nextQuestionTime, setNextQuestionTime] = useState<number | null>(null);
  const [startTime] = useState<number>(Date.now());

  const handleTimeUp = useCallback(() => {
    // Auto-submit with no answer (penalty)
    handleAnswerSubmit(null);
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !showResult && !waitingForNext) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !waitingForNext) {
      handleTimeUp();
    }
  }, [timeLeft, showResult, waitingForNext, handleTimeUp]);

  useEffect(() => {
    if (nextQuestionTime && nextQuestionTime > 0) {
      const timer = setTimeout(() => setNextQuestionTime(nextQuestionTime - 1), 1000);
      return () => clearTimeout(timer);
    } else if (nextQuestionTime === 0) {
      // Move to next question or complete quiz
      if (currentQuestion < quizData.length - 1) {
        // Move to next question
        setCurrentQuestion(currentQuestion + 1);
        setTimeLeft(quizData[currentQuestion + 1].timeLimit);
        setSelectedAnswer(null);
        setShowResult(false);
        setWaitingForNext(false);
        setNextQuestionTime(null);
      } else {
        // Quiz is complete - calculate total time and show results
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        const timeString = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`;
        onComplete(score, answers, timeString);
      }
    }
  }, [nextQuestionTime, currentQuestion, score, answers, onComplete, startTime]);

  const handleAnswerSubmit = (answerIndex: number | null) => {
    const question = quizData[currentQuestion];
    const isCorrect = answerIndex === question.correct;
    const newScore = isCorrect ? score + 1 : score - 1;
    
    setAnswers([...answers, {
      questionId: question.id,
      selectedAnswer: answerIndex,
      correct: question.correct,
      isCorrect
    }]);
    
    setScore(newScore);
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    // Start 30-minute countdown for next question (using 10 seconds for demo)
    setTimeout(() => {
      setWaitingForNext(true);
      setNextQuestionTime(10); // 1800 seconds = 30 minutes (using 10 for demo)
    }, 3000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWaitTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const question = quizData[currentQuestion];

  if (waitingForNext && nextQuestionTime !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-4xl font-bold text-blue-600 mb-4">
              Loading...
            </div>
            <p className="text-gray-600">
              Preparing next question
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-semibold">Current Score: {score}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Trivia</h1>
          <div className="flex justify-center items-center space-x-6 text-white">
            <div className="flex items-center space-x-2">
              <Trophy className="text-yellow-400" size={20} />
              <span>Score: {score}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="text-blue-400" size={20} />
              <span className={timeLeft < 60 ? 'text-red-400 font-bold' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-white mb-2">
            <span>Question {currentQuestion + 1} of {quizData.length}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / quizData.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && handleAnswerSubmit(index)}
                disabled={showResult}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                  showResult
                    ? index === question.correct
                      ? 'bg-green-100 border-green-500 text-green-800'
                      : selectedAnswer === index
                      ? 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                    : 'bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <span className="font-semibold mr-3">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                  {showResult && index === question.correct && (
                    <Star className="ml-auto text-green-600" size={20} />
                  )}
                </div>
              </button>
            ))}
          </div>

          {showResult && (
            <div className="mt-6 space-y-4">
              <div className="p-4 rounded-lg bg-gray-100">
                <p className={`font-semibold ${
                  selectedAnswer === question.correct ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedAnswer === question.correct ? '✅ Correct!' : '❌ Wrong!'}
                  {selectedAnswer === null && ' ⏰ Time&apos;s up!'}
                </p>
              </div>
              
              {/* Explanation */}
              <div className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Explanation:</h4>
                <p className="text-blue-700">{question.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsPage: React.FC<ResultsPageProps> = ({ score, answers, onRestart, context }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const totalQuestions = quizData.length;
  const correctAnswers = answers.filter((a: Answer) => a.isCorrect).length;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Calculate total time (simplified for demo)
  const totalTime = "2:30"; // This would be calculated from actual start/end times

  const fetchLeaderboard = useCallback(async () => {
    console.log('🔍 Fetching leaderboard...');
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      console.log('📥 Leaderboard response:', data);
      
      if (data.leaderboard) {
        console.log(`📊 Setting leaderboard with ${data.leaderboard.length} entries`);
        setLeaderboard(data.leaderboard);
      } else {
        console.warn('⚠️ No leaderboard data in response');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      // Set empty leaderboard on error to prevent crashes
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitScore = useCallback(async () => {
    if (!context?.user?.fid || submitted) {
      console.log('🚫 Skipping score submission:', { 
        hasFid: !!context?.user?.fid, 
        submitted, 
        user: context?.user 
      });
      return;
    }

    console.log('📝 Starting score submission:', {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      score,
      totalTime
    });

    setSubmitting(true);
    try {
      const payload = {
        fid: context.user.fid,
        username: context.user.username,
        displayName: context.user.displayName,
        pfpUrl: context.user.pfpUrl,
        score: score,
        time: totalTime,
      };

      console.log('📤 Sending payload:', payload);

      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📥 Response received:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Score submitted successfully');
        setLeaderboard(data.leaderboard || []);
        setSubmitted(true);
      } else {
        console.warn('❌ Score submission failed:', data.error);
        // Still mark as submitted to prevent retries
        setSubmitted(true);
      }
    } catch (error) {
      console.error('❌ Failed to submit score:', error);
      // Mark as submitted even on error to prevent infinite retries
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [context?.user?.fid, submitted, score, totalTime]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-submit score when component mounts if user is authenticated
  useEffect(() => {
    if (context?.user?.fid && !submitted) {
      submitScore();
    }
  }, [context?.user?.fid, submitted, submitScore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Results Summary */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center mb-8">
          <div className="mb-6">
            <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quiz Complete!</h1>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{score}</div>
              <div className="text-sm text-blue-800">Final Score</div>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}/{totalQuestions}</div>
              <div className="text-sm text-green-800">Correct</div>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
              <div className="text-sm text-purple-800">Accuracy</div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance:</h3>
            {score >= 3 && <p className="text-green-600 font-semibold">🎉 Excellent! You&apos;re a trivia master!</p>}
            {score >= 1 && score < 3 && <p className="text-yellow-600 font-semibold">👍 Good job! Keep practicing!</p>}
            {score < 1 && <p className="text-red-600 font-semibold">💪 Don&apos;t give up! Try again!</p>}
          </div>

          <button
            onClick={onRestart}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-8 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Play Again 🔄
          </button>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Public Leaderboard</h2>
            <p className="text-gray-600">All Quiz Trivia Participants</p>
            {!loading && (
              <div className="mt-2 text-sm text-gray-500">
                {leaderboard.length} participants • Last updated: {new Date().toLocaleString()}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No participants yet. Be the first to complete the quiz!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leaderboard.map((player, index) => (
                <div
                  key={player.fid}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    index < 3
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      player.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      player.rank === 2 ? 'bg-gray-400 text-gray-900' :
                      player.rank === 3 ? 'bg-orange-500 text-orange-900' :
                      'bg-blue-500 text-blue-900'
                    }`}>
                      {player.rank === 1 ? '🥇' : 
                       player.rank === 2 ? '🥈' : 
                       player.rank === 3 ? '🥉' : player.rank}
                    </div>
                    <div className="flex items-center space-x-3">
                      {player.pfpUrl && (
                        <img 
                          src={player.pfpUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">
                          {player.displayName || player.username}
                        </div>
                        <div className="text-sm text-gray-500">@{player.username}</div>
                        <div className="text-xs text-gray-400">
                          Completed in {player.time}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">{player.score}</div>
                    <div className="text-xs text-gray-500">points</div>
                    <div className="text-xs text-gray-400">
                      {new Date(player.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Player Position */}
          {context?.user?.fid && (
            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {context.user.pfpUrl && (
                    <img 
                      src={context.user.pfpUrl} 
                      alt="Your Profile" 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-blue-800">
                      {context.user.displayName || context.user.username}
                    </div>
                    <div className="text-sm text-blue-600">Your Score</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">{score}</div>
                  <div className="text-xs text-blue-500">points</div>
                  {submitting && <div className="text-xs text-blue-500">Submitting...</div>}
                  {submitted && <div className="text-xs text-green-500">✓ Submitted</div>}
                </div>
              </div>
            </div>
          )}

          {/* Share Leaderboard Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                alert('Leaderboard URL copied to clipboard!');
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
            >
              📋 Share Leaderboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
export default function QuizTriviaApp() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'quiz' | 'results'>('home');
  const [showRules, setShowRules] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);

  // Get Farcaster context
  const { context } = useMiniApp();

  const handleStartQuiz = () => {
    setCurrentScreen('quiz');
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
  };

  const handleQuizComplete = (score: number, answers: Answer[], _time: string) => {
    setFinalScore(score);
    setFinalAnswers(answers);
    setCurrentScreen('results');
  };

  const handleRestart = () => {
    setCurrentScreen('home');
    setFinalScore(0);
    setFinalAnswers([]);
  };

  return (
    <div className="w-full h-screen">
      {currentScreen === 'home' && (
        <HomePage 
          onStartQuiz={handleStartQuiz}
          onShowRules={handleShowRules}
        />
      )}
      
      {currentScreen === 'quiz' && (
        <QuizPage 
          onComplete={handleQuizComplete}
          context={context}
        />
      )}
      
      {currentScreen === 'results' && (
        <ResultsPage 
          score={finalScore}
          answers={finalAnswers}
          onRestart={handleRestart}
          context={context}
        />
      )}
      
      {showRules && (
        <RulesPopup onClose={handleCloseRules} />
      )}
    </div>
  );
}

// Export HomeTab as a named export for compatibility
export { QuizTriviaApp as HomeTab };