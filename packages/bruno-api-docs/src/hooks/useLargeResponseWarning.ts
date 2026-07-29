import { useState, useRef, useMemo } from 'react';
import type { RunRequestResponse } from '../runner';

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export default function useLargeResponse(response: RunRequestResponse | undefined) {
  const responseSize
    = typeof response?.size === 'number'
      ? response.size
      : response?.base64Data
        ? Math.floor(response.base64Data.length * 0.75) // base64 is ~4/3 of the raw bytes
        : 0;
  const isLargeResponse = responseSize > LARGE_RESPONSE_THRESHOLD;

  const [revealed, setRevealed] = useState(false);
  const prevResponseRef = useRef(response);
  if (prevResponseRef.current !== response) {
    prevResponseRef.current = response;
    if (revealed) setRevealed(false);
  }
  const hideForLargeResponse = isLargeResponse && !revealed;

  return useMemo(
    () => ({ hideForLargeResponse, responseSize, setRevealed }),
    [hideForLargeResponse, responseSize]
  );
}
