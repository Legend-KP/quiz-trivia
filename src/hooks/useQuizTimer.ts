import { useState, useEffect } from 'react';
import { formatCountdown } from '@/utils/quizSchedule';

/**
 * Custom hook for countdown timer functionality
 * Updates every second and formats time remaining
 */
export function useCountdown(targetTime: string): string {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const diff = target - now;
      
      if (diff <= 0) return 'Starting...';
      
      return formatCountdown(diff);
    };
    
    // Set initial value
    setTimeLeft(calculateTimeLeft());
    
    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetTime]);
  
  return timeLeft;
}

/**
 * Hook for quiz state management
 * Calculates current state and provides countdown
 */
export function useQuizState(config: { startTime: string; endTime: string }) {
  const [state, setState] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [countdown, setCountdown] = useState('');
  
  useEffect(() => {
    const updateState = () => {
      const now = Date.now();
      const start = new Date(config.startTime).getTime();
      const end = new Date(config.endTime).getTime();
      
      if (now < start) {
        setState('upcoming');
        setCountdown(formatCountdown(start - now));
      } else if (now >= start && now < end) {
        setState('live');
        setCountdown(formatCountdown(end - now));
      } else {
        setState('ended');
        setCountdown('Ended');
      }
    };
    
    // Update immediately
    updateState();
    
    // Update every second
    const timer = setInterval(updateState, 1000);
    
    return () => clearInterval(timer);
  }, [config.startTime, config.endTime]);
  
  return { state, countdown };
}
