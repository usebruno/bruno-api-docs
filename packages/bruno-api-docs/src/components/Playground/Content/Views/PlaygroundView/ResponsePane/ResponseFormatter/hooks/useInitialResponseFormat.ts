import { useMemo } from 'react';
import type { ResponseBodyFormatViewData } from '../../../../../../../../constants';
import { detectContentTypeFromBase64, getDefaultResponseFormat, getContentType } from '../../../../../../../../utils/response';
import type { RunRequestResponse } from '../../../../../../../../runner';

interface InitialResponseFormatData extends ResponseBodyFormatViewData {
  detectedContentType: string | null;
  headerContentType: string;
  contentType: string;
}

export function useInitialResponseFormat(response: RunRequestResponse): InitialResponseFormatData {
  // Prefer the type sniffed from the bytes at parse time; fall back to sniffing the base64
  // (e.g. a binary body) when the response predates parse-time detection.
  const detectedContentType = useMemo(
    () => response?.detectedContentType ?? detectContentTypeFromBase64(response?.base64Data),
    [response?.detectedContentType, response?.base64Data]
  );
  const headerContentType = useMemo(() => getContentType(response?.headers), [response?.headers]);
  const contentType = detectedContentType ?? headerContentType;

  const initialFormatViewData = useMemo<ResponseBodyFormatViewData>(() => {
    if (detectedContentType === null) {
      return { format: 'raw', view: 'editor' };
    }

    return getDefaultResponseFormat(headerContentType || detectedContentType);
  }, [detectedContentType, headerContentType]);

  return useMemo(() => ({
    ...initialFormatViewData,
    detectedContentType,
    headerContentType,
    contentType
  }), [initialFormatViewData, detectedContentType, headerContentType, contentType]);
}
