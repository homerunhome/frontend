import { useCallback, useEffect, useState } from 'react';
import { getItinerary } from './client';
import type { ItineraryResponse } from './types';

export function useItinerary(id: number) {
  const [data, setData] = useState<ItineraryResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [requestKey, setRequestKey] = useState(0);

  const retry = useCallback(() => setRequestKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    getItinerary(id, controller.signal)
      .then(setData)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : '일정을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [id, requestKey]);

  return { data, error, isLoading, retry };
}
