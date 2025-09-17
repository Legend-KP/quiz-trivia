import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trophy, Star, X, Share2 } from 'lucide-react';
import { useMiniApp } from '@neynar/react';
import { APP_URL } from '~/lib/constants';

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
  timeInSeconds?: number;
  completedAt: number;
  rank?: number;
}

interface RulesPopupProps {
  onClose: () => void;
}

interface HomePageProps {
  balance: number | null;
  onStartClassic: () => void;
  onStartTimeMode: () => void;
  onStartChallenge: () => void;
  onShowRules: () => void;
  onClaimDaily: () => void;
}

interface QuizPageProps {
  onComplete: (score: number, answers: Answer[], time: string) => void;
  context?: any;
}

interface ResultsPageProps {
  score: number;
  answers: Answer[];
  time: string;
  onRestart: () => void;
  context?: any;
}

interface TimeModePageProps {
  onExit: () => void;
  context?: any;
}

interface ChallengeModePageProps {
  onExit: () => void;
  context?: any;
}

// Sample quiz data with explanations
const quizData: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the smallest unit of Ether called?",
    options: ["Gwei", "Satoshi", "Finney", "Wei"],
    correct: 3, // 0-based index for "Wei" (4th option)
    timeLimit: 60, // 1 minute in seconds
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
            <p>You&apos;ll get 1 minute per question – so think fast! ⏳</p>
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
const HomePage: React.FC<HomePageProps> = ({ balance, onStartClassic, onStartTimeMode, onStartChallenge, onShowRules, onClaimDaily }) => {
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

        {/* Balance + Claim Daily */}
        <div className="mb-6 text-white text-sm flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20">Coins: {balance ?? '—'}</span>
          <button onClick={onClaimDaily} className="px-3 py-1 rounded-full bg-yellow-500 text-yellow-900 font-semibold hover:bg-yellow-400 transition">Claim daily ✨</button>
        </div>

        {/* Mode Buttons */}
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={onStartTimeMode}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            Time Mode • 45s ⏱️
          </button>

          <button
            onClick={onStartClassic}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-4 px-8 rounded-xl text-xl hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            Classic Quiz 🧠
          </button>

          <button
            onClick={onStartChallenge}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-8 rounded-xl text-xl hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            Challenge (Beta) ⚔️
          </button>

          <button
            onClick={onShowRules}
            className="block mx-auto bg-white/15 backdrop-blur text-white font-semibold py-3 px-6 rounded-lg hover:bg-white/25 transform hover:scale-105 transition-all duration-200 shadow-lg"
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

  const handleAnswerSubmit = useCallback((answerIndex: number | null) => {
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

    // Check if this is the last question
    if (currentQuestion === quizData.length - 1) {
      // This is the last question, complete the quiz after showing result
      setTimeout(() => {
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        const timeString = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`;
        onComplete(newScore, [...answers, {
          questionId: question.id,
          selectedAnswer: answerIndex,
          correct: question.correct,
          isCorrect
        }], timeString);
      }, 3000);
    } else {
      // Start countdown for next question (using 10 seconds for demo)
      setTimeout(() => {
        setWaitingForNext(true);
        setNextQuestionTime(10); // 1800 seconds = 30 minutes (using 10 for demo)
      }, 3000);
    }
  }, [currentQuestion, score, answers, startTime, onComplete]);

  const handleTimeUp = useCallback(() => {
    // Auto-submit with no answer (penalty)
    handleAnswerSubmit(null);
  }, [handleAnswerSubmit]);

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
      // Move to next question (this will only happen for non-last questions)
      setCurrentQuestion(currentQuestion + 1);
      setTimeLeft(quizData[currentQuestion + 1].timeLimit);
      setSelectedAnswer(null);
      setShowResult(false);
      setWaitingForNext(false);
      setNextQuestionTime(null);
    }
  }, [nextQuestionTime, currentQuestion, startTime]);



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
            <Clock className="mx-auto mb-4 text-blue-500" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Next Question In:
            </h2>
            <div className="text-4xl font-bold text-blue-600 mb-4">
              {formatWaitTime(nextQuestionTime)}
            </div>
            <p className="text-gray-600">
              Question {currentQuestion + 2} of {quizData.length}
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
const ResultsPage: React.FC<ResultsPageProps> = ({ score, answers, onRestart, context, time }) => {
  const { actions } = useMiniApp();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const totalQuestions = quizData.length;
  const correctAnswers = answers.filter((a: Answer) => a.isCorrect).length;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Use the actual completion time passed from the quiz
  const totalTime = time || "0:00";

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
  }, [context?.user, submitted, score, totalTime]);

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
              onClick={async () => {
                try {
                  await actions.composeCast({
                    text: `I just played Quiz Trivia! 🎉 I scored ${score}. Come try it:`,
                    embeds: [
                      context?.user?.fid
                        ? `${APP_URL}/share/${context.user.fid}`
                        : `${APP_URL}`,
                    ],
                  });
                } catch (err) {
                  console.error('Failed to open Farcaster composer:', err);
                  const text = encodeURIComponent(`I just played Quiz Trivia! 🎉 I scored ${score}. Come try it:`);
                  const url = encodeURIComponent(
                    context?.user?.fid ? `${APP_URL}/share/${context.user.fid}` : `${APP_URL}`
                  );
                  const warpcastUrl = `https://warpcast.com/~/compose?text=${text}%20${url}`;
                  if (typeof window !== 'undefined') {
                    window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
            >
              📣 Share on Farcaster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Time Mode (45s) Component
const TimeModePage: React.FC<TimeModePageProps> = ({ onExit, context }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMoreQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions/random?limit=25');
      const d = await res.json();
      if (Array.isArray(d.questions)) {
        setQuestions((prev) => [...prev, ...d.questions]);
      }
    } catch (_e) {}
  }, []);

  const startRun = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/time/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid }) });
      const d = await res.json();
      if (!res.ok || !d?.success) {
        setError(d?.error || 'Unable to start Time Mode');
        return;
      }
      setSessionId(d.sessionId);
      setTimeLeft(d.durationSec || 45);
      setStarted(true);
      if (questions.length < 5) fetchMoreQuestions();
    } catch (_e) {
      setError('Network error');
    }
  }, [context?.user?.fid, fetchMoreQuestions, questions.length]);

  // countdown
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft]);

  // auto submit on end
  useEffect(() => {
    if (!started) return;
    if (timeLeft > 0) return;
    if (submitting) return;
    setSubmitting(true);
    const run = async () => {
      try {
        const payload = {
          fid: context?.user?.fid,
          correctCount,
          totalAnswered,
          durationSec: 45,
          avgAnswerTimeSec: totalAnswered > 0 ? 45 / totalAnswered : 0,
          username: context?.user?.username,
          displayName: context?.user?.displayName,
          pfpUrl: context?.user?.pfpUrl,
        };
        await fetch('/api/time/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (_e) {}
      setSubmitting(false);
    };
    run();
  }, [started, timeLeft, submitting, correctCount, totalAnswered, context?.user]);

  const handleAnswer = useCallback((idx: number) => {
    const q = questions[qIndex];
    if (!q) return;
    setTotalAnswered((n) => n + 1);
    if (idx === q.correct) setCorrectCount((n) => n + 1);
    const next = qIndex + 1;
    if (next >= questions.length - 3) fetchMoreQuestions();
    setQIndex(next);
  }, [questions, qIndex, fetchMoreQuestions]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const q = questions[qIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        {/* Top bar with back */}
        <div className="flex items-center justify-between mb-4 text-white">
          <button onClick={onExit} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">← Back</button>
          <div className="flex items-center gap-4">
            <div className="font-bold">Time: {formatTime(timeLeft)}</div>
            <div className="font-bold">Score: {correctCount}</div>
          </div>
        </div>

        {!started ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Time Mode • 45s</h2>
            <p className="text-gray-600 mb-6">Answer as many as you can. Costs 10 coins to start.</p>
            {error && <div className="mb-4 text-red-600 font-semibold">{error}</div>}
            <button onClick={startRun} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700">Start</button>
          </div>
        ) : timeLeft <= 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Time's up! ⏱️</h3>
            <p className="text-gray-700 mb-6">You answered {correctCount} correct out of {totalAnswered}.</p>
            <button onClick={onExit} className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-6 rounded-xl">Back to Home</button>
          </div>
        ) : !q ? (
          <div className="text-center text-white">Loading questions…</div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-gray-500 mb-2">Question {qIndex + 1}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <span className="font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChallengeModePageProps {
  onExit: () => void;
  context?: any;
}

const ChallengeModePage: React.FC<ChallengeModePageProps> = ({ onExit, context }) => {
  const [challengeId, setChallengeId] = React.useState<string>('');
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(120);
  const [started, setStarted] = React.useState(false);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/challenge/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid }) });
      const d = await res.json();
      if (!res.ok || !d?.success) { setError(d?.error || 'Failed to create'); return; }
      setActiveId(d.id);
      // fetch challenge details (has questions)
      const chRes = await fetch(`/api/challenge/${d.id}`);
      const ch = await chRes.json();
      setQuestions(ch?.challenge?.questions || []);
    } finally {
      setLoading(false);
    }
  };

  const acceptChallenge = async () => {
    if (!challengeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/challenge/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid, id: challengeId }) });
      const d = await res.json();
      if (!res.ok || !d?.success) { setError(d?.error || 'Failed to accept'); return; }
      setActiveId(challengeId);
      const chRes = await fetch(`/api/challenge/${challengeId}`);
      const ch = await chRes.json();
      setQuestions(ch?.challenge?.questions || []);
    } finally {
      setLoading(false);
    }
  };

  const startRound = () => {
    setStarted(true);
    setTimeLeft(120);
  };

  React.useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft]);

  React.useEffect(() => {
    if (!started || timeLeft > 0 || !activeId) return;
    // submit
    fetch('/api/challenge/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeId, fid: context?.user?.fid, correct, total, durationSec: 120 }) }).catch(() => {});
  }, [started, timeLeft, activeId, correct, total, context?.user?.fid]);

  const q = questions[qIndex];
  const onAnswer = (i: number) => {
    if (!q) return;
    setTotal((n) => n + 1);
    if (i === q.correct) setCorrect((n) => n + 1);
    setQIndex((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-4 text-white">
          <button onClick={onExit} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">← Back</button>
          <div className="font-bold">{started ? `Time: ${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : 'Challenge Mode'}</div>
        </div>

        {!activeId ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create or Join</h2>
            {error && <div className="mb-4 text-red-600 font-semibold">{error}</div>}
            <div className="flex flex-col gap-3">
              <button disabled={loading} onClick={createChallenge} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-60">Create Challenge (10 coins)</button>
              <div className="flex items-center gap-2">
                <input value={challengeId} onChange={(e)=>setChallengeId(e.target.value)} placeholder="Enter Challenge ID" className="flex-1 px-3 py-2 border rounded" />
                <button disabled={loading || !challengeId} onClick={acceptChallenge} className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-2 px-4 rounded-xl disabled:opacity-60">Accept</button>
              </div>
            </div>
          </div>
        ) : !started ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Challenge Ready</h3>
            <p className="text-gray-600 mb-6">ID: {activeId}. 10 questions • 120s.</p>
            <button onClick={startRound} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl">Start</button>
          </div>
        ) : !q ? (
          <div className="text-center text-white">Loading…</div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-gray-500 mb-2">Question {qIndex + 1} of 10</div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => onAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <span className="font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function QuizTriviaApp() {
  const { actions } = useMiniApp();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'quiz' | 'results' | 'time' | 'challenge'>('home');
  const [showRules, setShowRules] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);
  const [finalTime, setFinalTime] = useState<string>('0:00');
  const [balance, setBalance] = useState<number | null>(null);

  // Get Farcaster context
  const { context } = useMiniApp();

  const handleStartQuiz = () => {
    setCurrentScreen('quiz');
  };

  const handleStartTime = () => {
    setCurrentScreen('time');
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
  };

  const handleQuizComplete = (score: number, answers: Answer[], time: string) => {
    setFinalScore(score);
    setFinalAnswers(answers);
    setFinalTime(time);
    setCurrentScreen('results');
  };

  const handleRestart = () => {
    setCurrentScreen('home');
    setFinalScore(0);
    setFinalAnswers([]);
    setFinalTime('0:00');
  };

  // Fetch balance
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid) return;
    fetch(`/api/currency/balance?fid=${fid}`)
      .then(r => r.json())
      .then(d => setBalance(typeof d.balance === 'number' ? d.balance : null))
      .catch(() => {});
  }, [context?.user?.fid]);

  const handleClaimDaily = async () => {
    const fid = context?.user?.fid;
    if (!fid) return;
    const res = await fetch('/api/currency/claim-daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid }) });
    const d = await res.json();
    if (d?.balance !== undefined) setBalance(d.balance);
  };

  return (
    <div className="w-full h-screen">
      {currentScreen === 'home' && (
        <HomePage 
          balance={balance}
          onStartClassic={handleStartQuiz}
          onStartTimeMode={handleStartTime}
          onStartChallenge={() => setCurrentScreen('challenge')}
          onShowRules={handleShowRules}
          onClaimDaily={handleClaimDaily}
        />
      )}
      
      {currentScreen === 'quiz' && (
        <QuizPage 
          onComplete={handleQuizComplete}
          context={context}
        />
      )}
      
      {currentScreen === 'time' && (
        <TimeModePage 
          onExit={() => setCurrentScreen('home')}
          context={context}
        />
      )}

      {currentScreen === 'challenge' && (
        <ChallengeModePage 
          onExit={() => setCurrentScreen('home')}
          context={context}
        />
      )}

      {currentScreen === 'results' && (
        <ResultsPage 
          score={finalScore}
          answers={finalAnswers}
          time={finalTime}
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