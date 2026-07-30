import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunRequestResponse } from '@/runner';
import type { ResponseBodyFormat } from '@/constants';
import { formatResponse } from '@/utils/dataFormatter';

const getCopyText = (
  response: RunRequestResponse,
  selectedFormat: ResponseBodyFormat,
  showPreview: boolean
): string => {
  const data = response?.data;
  const dataBuffer = response?.base64Data;
  // Preview shows the raw data, so copy that as-is.
  if (showPreview) {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
  // The editor shows the body formatted for the selected format; mirror it when a buffer is present.
  if (selectedFormat && data && dataBuffer) {
    return formatResponse(data, dataBuffer, selectedFormat);
  }
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
};

export const useCopyResponse = (
  response: RunRequestResponse,
  selectedFormat: ResponseBodyFormat,
  showPreview: boolean
) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const disabled = !response?.data;

  const copyResponse = useCallback(async () => {
    if (disabled || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(getCopyText(response, selectedFormat, showPreview));
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently.
    }
  }, [response, selectedFormat, showPreview, disabled]);

  return { copied, copyResponse, disabled };
};
