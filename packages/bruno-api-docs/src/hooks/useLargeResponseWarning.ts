import { useState, useRef, useMemo } from 'react';
import type { RunRequestResponse } from '../runner';
import { getResponseSize } from '../utils/response';

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export default function useLargeResponse(response: RunRequestResponse | undefined) {
  const responseSize = getResponseSize(response?.size, response?.base64Data);
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
