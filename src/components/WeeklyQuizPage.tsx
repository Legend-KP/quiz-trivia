  import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const WeeklyQuizPage: React.FC<WeeklyQuizPageProps> = ({ config, onComplete, context }) => {
    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(config.questions[0].timeLimit);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [pausedTime, setPausedTime] = useState<number>(0); // Track total paused time
    const [pauseStartTime, setPauseStartTime] = useState<number | null>(null); // When pause started
    const pausedTimeRef = useRef<number>(0); // Ref to track paused time for closure access
    const pauseStartTimeRef = useRef<number | null>(null); // Ref to track pause start for closure access
    const startTimeRef = useRef<number | null>(null); // Ref to track start time for closure access
    const questionStartTimeRef = useRef<number | null>(null); // Track when current question started (for timestamp-based timer)
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [checkingCompletion, setCheckingCompletion] = useState(true);

    // Sync refs with state
    useEffect(() => {
      pausedTimeRef.current = pausedTime;
    }, [pausedTime]);

    useEffect(() => {
      pauseStartTimeRef.current = pauseStartTime;
    }, [pauseStartTime]);

    useEffect(() => {
      startTimeRef.current = startTime;
    }, [startTime]);

    // Check if user has already completed this quiz (server-side check)
    useEffect(() => {
      const checkCompletion = async () => {
        const fid = context?.user?.fid;
        const quizId = config.id;
        
        if (!fid || !quizId) {
          setCheckingCompletion(false);
          return;
        }

        try {
          const res = await fetch(`/api/leaderboard/check?fid=${fid}&quizId=${quizId}`);
          const data = await res.json();
          
          if (data.completed) {
            setAlreadyCompleted(true);
            // Show alert and prevent quiz start
            alert('You have already completed this quiz. Each user can only take the quiz once per session.');
          }
        } catch (error) {
          console.error('Failed to check completion status:', error);
        } finally {
          setCheckingCompletion(false);
        }
      };

      checkCompletion();
    }, [context?.user?.fid, config.id]);

    const handleAnswerSubmit = useCallback((answerIndex: number | null) => {
      const question = config.questions[currentQuestion];
      if (!question) return; // Safety check
      
      const isCorrect = answerIndex === question.correct;
      // Weekly mode scoring: +1 for correct, -0.5 for wrong, 0 for unanswered/missed
      // Use functional update to avoid stale closure issues
      setScore(prevScore => {
        const newScore = isCorrect ? prevScore + 1 : (answerIndex === null ? prevScore : prevScore - 0.5);
        return newScore;
      });
      
      setAnswers(prevAnswers => [...prevAnswers, {
        questionId: question.id,
        selectedAnswer: answerIndex,
        correct: question.correct,
        isCorrect
      }]);
      
      setSelectedAnswer(answerIndex);
      setShowResult(true);
      
      // Pause overall quiz timer when showing result (3 seconds)
      // Note: Question timer automatically pauses because useEffect returns early when showResult is true
      if (pauseStartTime === null) {
        setPauseStartTime(Date.now());
      }

      // Check if this is the last question
      if (currentQuestion === config.questions.length - 1) {
        // Complete the quiz after showing result
        setTimeout(() => {
          // Use functional updates to get latest state values
          setScore(currentScore => {
            // Calculate total elapsed time from quiz start to completion
            const actualStartTime = startTimeRef.current;
            if (!actualStartTime) {
              console.error('Start time not set, using fallback');
              // Fallback: use a reasonable estimate (10 questions * 30 seconds average = 5 minutes)
              const fallbackTime = 300; // 5 minutes in seconds
              const minutes = Math.floor(fallbackTime / 60);
              const seconds = fallbackTime % 60;
              const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              
              setAnswers(currentAnswers => {
                onComplete(currentScore, [...currentAnswers, {
                  questionId: question.id,
                  selectedAnswer: answerIndex,
                  correct: question.correct,
                  isCorrect
                }], timeString);
                return currentAnswers;
              });
              return currentScore;
            }
            
            // Calculate total paused time
            // Each question result display is 3 seconds (except we're still in the last one)
            // So for 10 questions, we have 9 pauses of 3 seconds each = 27 seconds
            const questionsAnswered = currentQuestion + 1;
            const resultDisplayPauses = (questionsAnswered - 1) * 3; // Pauses between questions
            
            // Add current pause if still active (the last question's result display)
            let currentPause = 0;
            if (pauseStartTimeRef.current) {
              currentPause = (Date.now() - pauseStartTimeRef.current) / 1000;
            }
            
            const totalPaused = resultDisplayPauses + currentPause;
            
            // Total elapsed time from start to now (in seconds)
            const totalElapsed = (Date.now() - actualStartTime) / 1000;
            
            // Active time = total elapsed - paused time (time spent actually answering questions)
            const activeTime = Math.max(Math.floor(totalElapsed - totalPaused), 1);
            
            // Format as MM:SS
            const minutes = Math.floor(activeTime / 60);
            const seconds = activeTime % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            console.log('⏱️ Time calculation:', {
              startTime: new Date(actualStartTime).toISOString(),
              endTime: new Date().toISOString(),
              totalElapsed: totalElapsed.toFixed(2),
              totalPaused: totalPaused.toFixed(2),
              activeTime,
              timeString
            });
            
            // Get latest answers state
            setAnswers(currentAnswers => {
              onComplete(currentScore, [...currentAnswers, {
                questionId: question.id,
                selectedAnswer: answerIndex,
                correct: question.correct,
                isCorrect
              }], timeString);
              return currentAnswers;
            });
            
            return currentScore;
          });
        }, 3000);
      } else {
        // Move to next question immediately after showing result (3 seconds)
        setTimeout(() => {
          // Resume overall quiz timer after result display
          if (pauseStartTime) {
            setPausedTime(prev => prev + (Date.now() - pauseStartTime) / 1000);
            setPauseStartTime(null);
          }
          // Move to next question immediately
          setCurrentQuestion(currentQuestion + 1);
          setTimeLeft(config.questions[currentQuestion + 1].timeLimit);
          setSelectedAnswer(null);
          setShowResult(false);
          // Reset question start time for timestamp-based timer
          questionStartTimeRef.current = Date.now();
        }, 3000);
      }
    }, [currentQuestion, score, answers, startTime, pausedTime, pauseStartTime, onComplete, config.questions]);

    const handleTimeUp = useCallback(() => {
      handleAnswerSubmit(null);
    }, [handleAnswerSubmit]);

    // Timestamp-based timer that continues even when app is in background
    useEffect(() => {
      if (!started || showResult) return;
      
      // Initialize question start time if not set
      if (questionStartTimeRef.current === null) {
        questionStartTimeRef.current = Date.now();
      }
      
      const updateTimer = () => {
        if (!questionStartTimeRef.current) return;
        
        // Calculate elapsed time - the start time is already adjusted when paused
        // so this calculation automatically accounts for the pause
        const elapsed = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        const remaining = config.questions[currentQuestion].timeLimit - elapsed;
        
        if (remaining <= 0) {
          setTimeLeft(0);
          handleTimeUp();
        } else {
          setTimeLeft(remaining);
        }
      };
      
      // Update immediately
      updateTimer();
      
      // Update every 100ms for smooth countdown (more frequent updates for accuracy)
      const interval = setInterval(updateTimer, 100);
      
      return () => clearInterval(interval);
    }, [started, showResult, currentQuestion, config.questions, handleTimeUp]);
    
    // Reset question start time when question changes
    useEffect(() => {
      if (started && !showResult) {
        questionStartTimeRef.current = Date.now();
      }
    }, [currentQuestion, started, showResult]);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    const question = config.questions[currentQuestion];

    // Start screen before quiz begins
    if (!started) {
      if (checkingCompletion) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
              <div className="spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking completion status...</p>
            </div>
          </div>
        );
      }

      if (alreadyCompleted) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Already Completed ✓</h2>
              <p className="text-gray-700 mb-6">
                You have already completed this Weekly Quiz. Each user can only take the quiz once per session.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Weekly Quiz Challenge 🧠</h2>
            <div className="text-gray-700 space-y-2 mb-6 text-left">
              <p>📋 The quiz has <strong>10 questions</strong>.</p>
              <p>⏳ You&apos;ll get <strong>45 seconds</strong> per question — so think fast!</p>
              <p>✅ Correct answer = +1 point</p>
              <p>❌ Wrong answer = -0.5 point</p>
              <p>⏰ Missed/No answer = 0 points</p>
              <p>🏆 Top 10 winners get QT token rewards!</p>
              <p>🎯 Topic: <strong>{config.topic}</strong></p>
            </div>
            <button
              onClick={() => {
                setStartTime(Date.now()); // Set start time when quiz actually starts
                questionStartTimeRef.current = Date.now(); // Initialize question start time
                setStarted(true);
              }}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all"
            >
              Start Weekly Quiz
            </button>
          </div>
        </div>
      );
    }


    // Main Quiz UI
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 overflow-y-auto h-screen" style={{ scrollBehavior: 'smooth' }}>
        <div className="max-w-2xl mx-auto pt-4 pb-20">
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
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-6">{question.question}</h2>

            <div className="space-y-3 mb-4">
              {(() => {
                // Filter and validate options: remove empty/invalid and limit to 4
                const validOptions = question.options
                  .map((opt, idx) => ({ option: opt, originalIndex: idx }))
                  .filter((item) => item.option && typeof item.option === 'string' && item.option.trim().length > 0)
                  .slice(0, 4);
                
                return validOptions.map((item, displayIndex) => {
                  const isCorrect = item.originalIndex === question.correct;
                  const isSelected = selectedAnswer === item.originalIndex;
                  
                  return (
                    <button
                      key={item.originalIndex}
                      onClick={() => !showResult && handleAnswerSubmit(item.originalIndex)}
                      disabled={showResult}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-100 border-green-500 text-green-800'
                            : isSelected
                            ? 'bg-red-100 border-red-500 text-red-800'
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                          : 'bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-black'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="font-semibold mr-3 flex-shrink-0">
                          {String.fromCharCode(65 + displayIndex)}.
                        </span>
                        <span className="flex-1 break-words">{item.option}</span>
                        {showResult && isCorrect && (
                          <Star className="ml-auto text-green-600 flex-shrink-0" size={20} />
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            {showResult && (
              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-lg bg-gray-100">
                  <p className={`font-semibold ${
                    selectedAnswer === question.correct ? 'text-green-600' : selectedAnswer === null ? 'text-gray-600' : 'text-red-600'
                  }`}>
                    {selectedAnswer === question.correct ? '✅ Correct! (+1 point)' : selectedAnswer === null ? '⏰ Time\'s up! (0 points)' : '❌ Wrong! (-0.5 point)'}
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
