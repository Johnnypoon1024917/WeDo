import { useState, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour <= 10) return 'dawn';
  if (hour >= 11 && hour <= 16) return 'day';
  if (hour >= 17 && hour <= 20) return 'sunset';
  return 'night';
}

function getCurrentTimeOfDay(): TimeOfDay {
  return getTimeOfDay(new Date().getHours());
}

export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getCurrentTimeOfDay);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        setTimeOfDay(getCurrentTimeOfDay());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return timeOfDay;
}
