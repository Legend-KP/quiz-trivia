import { useState, useEffect } from 'react';
import { WeeklyQuizConfig, QuizState, calculateQuizState } from '~/lib/weeklyQuiz';

// Hook for countdown timer
export function useCountdown(targetTime: string | Date): string {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const target = typeof targetTime === 'string' 
        ? new Date(targetTime).getTime() 
        : targetTime.getTime();
      const diff = target - now;
      
      if (diff <= 0) return 'Starting...';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetTime]);
  
  return timeLeft;
}

// Hook for quiz state management
export function useQuizState(config: WeeklyQuizConfig): QuizState {
  const [state, setState] = useState<QuizState>(() => calculateQuizState(config));
  
  useEffect(() => {
    const checkState = () => {
      setState(calculateQuizState(config));
    };
    
    // Update state every second to handle transitions accurately
    const interval = setInterval(checkState, 1000);
    
    return () => clearInterval(interval);
  }, [config]);
  
  return state;
}