import { useEffect, useState } from 'react';
import { getDatabase } from '@/db/database';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setIsReady(true))
      .catch((err) => console.error('[DB] Init failed:', err));
  }, []);

  return { isReady };
}
