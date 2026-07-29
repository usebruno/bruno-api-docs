import { useCallback, useEffect, useRef, useState } from 'react';
import { RunRequestResponse } from '../../../../../../../../../runner';
import { ResponseBodyFormat } from '../../../../../../../../../constants';
import { formatResponse } from '../../../../../../../../../utils/dataFormatter';

const getCopyText = (response: RunRequestResponse, selectedFormat: ResponseBodyFormat, showPreview: boolean): string => {
  const data = response?.data;
  const raw = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  // formatResponse decodes base64Data to produce the byte/prettified formats and returns '' when the
  // buffer is absent, so only defer to it when there is a buffer; otherwise copy the raw data.
  if (!showPreview && response?.base64Data) {
    return formatResponse(data, response.base64Data, selectedFormat);
  }
  return raw;
};

export const useCopyResponse = (response: RunRequestResponse, selectedFormat: ResponseBodyFormat, showPreview: boolean) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const disabled = response?.data == null && !response?.base64Data;

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
