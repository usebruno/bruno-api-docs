import { useState, useRef, useMemo } from "react";
import { RunRequestResponse } from "../runner";
import { LARGE_BUFFER_THRESHOLD } from "../utils/dataFormatter";

export default function useLargeResponse(response: RunRequestResponse | undefined) {
  const responseSize = response?.size ?? 0;
  const isLargeResponse = responseSize > LARGE_BUFFER_THRESHOLD;

  const [revealed, setRevealed] = useState(false);
  const prevResponseRef = useRef(response);
  if (prevResponseRef.current !== response) {
    prevResponseRef.current = response;
    if (revealed) setRevealed(false);
  }
  const hideForLargeResponse = isLargeResponse && !revealed;
  const result =  useMemo(() => ({ 
    hideForLargeResponse,
    responseSize,
    setRevealed
  }), [hideForLargeResponse, responseSize]);

  return result;
}
