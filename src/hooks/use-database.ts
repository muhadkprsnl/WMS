import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/database';

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize database'));
        console.error('Database initialization failed:', err);
      }
    };

    init();
  }, []);

  return { isInitialized, error };
}
