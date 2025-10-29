  import React, { useState, useEffect, useCallback } from 'react';
  import { Clock, Trophy, Star } from 'lucide-react';
  import { WeeklyQuizConfig } from '~/lib/weeklyQuiz';

  // Type definitions
  interface Answer {
    questionId: number;
    selectedAnswer: number | null;
    correct: number;
    isCorrect: boolean;
  }

  interface WeeklyQuizPageProps {
    config: WeeklyQuizConfig;
    onComplete: (score: number, answers: Answer[], time: string) => void;
    context?: any;
  }

  // Weekly Quiz Component
  const WeeklyQuizPage: React.FC<WeeklyQuizPageProps> = ({ config, onComplete, context: _context }) => {
    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(config.questions[0].timeLimit);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [waitingForNext, setWaitingForNext] = useState(false);
    const [nextQuestionTime, setNextQuestionTime] = useState<number | null>(null);
    const [startTime] = useState<number>(Date.now());

    const handleAnswerSubmit = useCallback((answerIndex: number | null) => {
      const question = config.questions[currentQuestion];
      const isCorrect = answerIndex === question.correct;
      // Weekly mode scoring: +1 for correct, -1 for wrong, 0 for unanswered/missed
      const newScore = isCorrect ? score + 1 : (answerIndex === null ? score : score - 1);
      
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
      if (currentQuestion === config.questions.length - 1) {
        // Complete the quiz after showing result
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
        // Countdown for next question (10 seconds)
        setTimeout(() => {
          setWaitingForNext(true);
          setNextQuestionTime(10);
        }, 3000);
      }
    }, [currentQuestion, score, answers, startTime, onComplete, config.questions]);

    const handleTimeUp = useCallback(() => {
      handleAnswerSubmit(null);
    }, [handleAnswerSubmit]);

    useEffect(() => {
      if (!started) return;
      if (timeLeft > 0 && !showResult && !waitingForNext) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else if (timeLeft === 0 && !waitingForNext) {
        handleTimeUp();
      }
    }, [timeLeft, showResult, waitingForNext, handleTimeUp, started]);

    useEffect(() => {
      if (nextQuestionTime && nextQuestionTime > 0) {
        const timer = setTimeout(() => setNextQuestionTime(nextQuestionTime - 1), 1000);
        return () => clearTimeout(timer);
      } else if (nextQuestionTime === 0) {
        setCurrentQuestion(currentQuestion + 1);
        setTimeLeft(config.questions[currentQuestion + 1].timeLimit);
        setSelectedAnswer(null);
        setShowResult(false);
        setWaitingForNext(false);
        setNextQuestionTime(null);
      }
    }, [nextQuestionTime, currentQuestion, config.questions]);

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

    const question = config.questions[currentQuestion];

    // Start screen before quiz begins
    if (!started) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Quiz Challenge 🧠</h2>
            <div className="text-gray-700 space-y-2 mb-6 text-left">
              <p>📋 The quiz has <strong>10 questions</strong> with <strong>10-second intervals</strong> between each question.</p>
              <p>⏳ You&apos;ll get <strong>45 seconds</strong> per question — so think fast!</p>
              <p>✅ Correct answer = +1 point</p>
              <p>❌ Wrong answer = -1 point</p>
              <p>⏰ Missed/No answer = 0 points</p>
              <p>🏆 Top 10 winners get QT token rewards!</p>
              <p>🎯 Topic: <strong>{config.topic}</strong></p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all"
            >
              Start Weekly Quiz
            </button>
          </div>
        </div>
      );
    }

    // Waiting countdown for next question
    if (waitingForNext && nextQuestionTime !== null) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <Clock className="mx-auto mb-4 text-blue-500" size={48} />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Next Question In:</h2>
              <div className="text-4xl font-bold text-blue-600 mb-4">{formatWaitTime(nextQuestionTime)}</div>
              <p className="text-gray-600">Question {currentQuestion + 2} of {config.questions.length}</p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-semibold">Current Score: {score}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Main Quiz UI
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Weekly Quiz Challenge</h1>
            <div className="text-white text-lg mb-2">Topic: {config.topic}</div>
            <div className="flex justify-center items-center space-x-6 text-white">
              <div className="flex items-center space-x-2">
                <Trophy className="text-yellow-400" size={20} />
                <span>Score: {score}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="text-blue-400" size={20} />
                <span className={timeLeft < 60 ? 'text-red-400 font-bold' : ''}>{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-white mb-2">
              <span>Question {currentQuestion + 1} of {config.questions.length}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / config.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">{question.question}</h2>

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
                    selectedAnswer === question.correct ? 'text-green-600' : selectedAnswer === null ? 'text-gray-600' : 'text-red-600'
                  }`}>
                    {selectedAnswer === question.correct ? '✅ Correct! (+1 point)' : selectedAnswer === null ? '⏰ Time&apos;s up! (0 points)' : '❌ Wrong! (-1 point)'}
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

  export default WeeklyQuizPage;
