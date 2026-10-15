import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { parseKey, todayKey } from './calc';

/** Today's date key that rolls over at midnight and when the app returns from background. */
export function useToday() {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const next = parseKey(today);
    next.setDate(next.getDate() + 1);
    const timer = setTimeout(refresh, Math.max(1000, next.getTime() - Date.now() + 1000));
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);

  return today;
}
