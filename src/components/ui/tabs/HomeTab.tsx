"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Star, X } from 'lucide-react';

// Type definitions
interface QuizQuestion {
  id: number;
  difficulty: string;
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
}

interface Answer {
  questionId: number;
  selectedAnswer: number | null;
  correct: number;
  isCorrect: boolean;
}

interface RulesPopupProps {
  onClose: () => void;
}

interface HomePageProps {
  onStartQuiz: () => void;
  onShowRules: () => void;
}

interface QuizPageProps {
  onComplete: (score: number, answers: Answer[]) => void;
}

interface ResultsPageProps {
  score: number;
  answers: Answer[];
  onRestart: () => void;
}

// Sample quiz data with progressive difficulty
const quizData: QuizQuestion[] = [
  {
    id: 1,
    difficulty: "Easy",
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correct: 2,
    timeLimit: 300 // 5 minutes in seconds
  },
  {
    id: 2,
    difficulty: "Medium",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correct: 1,
    timeLimit: 300
  },
  {
    id: 3,
    difficulty: "Hard",
    question: "What is the smallest unit of matter?",
    options: ["Molecule", "Atom", "Electron", "Proton"],
    correct: 1,
    timeLimit: 300
  },
  {
    id: 4,
    difficulty: "Expert",
    question: "In which year was the first computer bug actually found?",
    options: ["1945", "1947", "1950", "1952"],
    correct: 1,
    timeLimit: 300
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
            <p>The quiz has 4 multiple-choice questions, each getting progressively harder. Questions will be posted at 30-minute intervals.</p>
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
        
        {/* CENTRAL DAO Logo - Same size as QUIZ TRIVIA */}
        <div className="mb-6">
          <img 
            src="/CentralDAO.png" 
            alt="CENTRAL DAO" 
            className="w-auto h-24 md:h-32 max-w-full"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            }}
          />
        </div>

        {/* PRESENTS - Reduced size */}
        <div className="mb-8">
          <h2 className="text-sm md:text-base font-light text-white uppercase tracking-widest" style={{
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '0.2em'
          }}>
            PRESENTS
          </h2>
        </div>

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

    // Move to next question after 2 seconds
    setTimeout(() => {
      if (currentQuestion < quizData.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setTimeLeft(quizData[currentQuestion + 1].timeLimit);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        onComplete(newScore, answers);
      }
    }, 2000);
  };

  useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      // Auto-submit with no answer (penalty)
      const question = quizData[currentQuestion];
      const isCorrect = null === question.correct;
      const newScore = isCorrect ? score + 1 : score - 1;
      
      setAnswers([...answers, {
        questionId: question.id,
        selectedAnswer: null,
        correct: question.correct,
        isCorrect
      }]);
      
      setScore(newScore);
      setSelectedAnswer(null);
      setShowResult(true);

      // Move to next question after 2 seconds
      setTimeout(() => {
        if (currentQuestion < quizData.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setTimeLeft(quizData[currentQuestion + 1].timeLimit);
          setSelectedAnswer(null);
          setShowResult(false);
        } else {
          onComplete(newScore, answers);
        }
      }, 2000);
    }
  }, [timeLeft, showResult, currentQuestion, score, answers, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const question = quizData[currentQuestion];

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
            <span className="text-yellow-400">{question.difficulty}</span>
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
            <div className="mt-6 p-4 rounded-lg bg-gray-100">
              <p className={`font-semibold ${
                selectedAnswer === question.correct ? 'text-green-600' : 'text-red-600'
              }`}>
                {selectedAnswer === question.correct ? '✅ Correct!' : '❌ Wrong!'}
                {selectedAnswer === null && ' ⏰ Time\'s up!'}
              </p>
              <p className="text-gray-600 mt-2">
                Moving to next question...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsPage: React.FC<ResultsPageProps> = ({ score, answers, onRestart }) => {
  const totalQuestions = quizData.length;
  const correctAnswers = answers.filter((a: Answer) => a.isCorrect).length;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
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
      </div>
    </div>
  );
};

// Main HomeTab Component
export function HomeTab() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'quiz' | 'results'>('home');
  const [showRules, setShowRules] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);

  const handleStartQuiz = () => {
    setCurrentScreen('quiz');
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
  };

  const handleQuizComplete = (score: number, answers: Answer[]) => {
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
        <QuizPage onComplete={handleQuizComplete} />
      )}
      
      {currentScreen === 'results' && (
        <ResultsPage 
          score={finalScore}
          answers={finalAnswers}
          onRestart={handleRestart}
        />
      )}
      
      {showRules && (
        <RulesPopup onClose={handleCloseRules} />
      )}
    </div>
  );
} 