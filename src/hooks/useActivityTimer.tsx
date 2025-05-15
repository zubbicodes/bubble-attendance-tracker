
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Time in milliseconds before logging out (2 minutes)
const INACTIVITY_TIMEOUT = 2 * 60 * 1000;

export const useActivityTimer = () => {
  const { logout } = useAuth();
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Reset the timer whenever there's user activity
  const resetTimer = useCallback(() => {
    if (timer) clearTimeout(timer);
    
    const newTimer = setTimeout(() => {
      console.log('Inactivity timeout reached - logging out');
      logout();
    }, INACTIVITY_TIMEOUT);
    
    setTimer(newTimer);
  }, [logout, timer]);

  // Setup activity listeners on mount
  useEffect(() => {
    // Events to track for activity
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ];
    
    // Setup initial timer
    resetTimer();
    
    // Add event listeners for each activity event
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
    
    // Cleanup event listeners on unmount
    return () => {
      if (timer) clearTimeout(timer);
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  return resetTimer;
};
