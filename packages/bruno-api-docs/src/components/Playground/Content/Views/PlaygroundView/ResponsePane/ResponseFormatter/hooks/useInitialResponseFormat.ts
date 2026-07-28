import { useMemo } from "react";
import { ResponseBodyFormatViewData } from "../../../../../../../../constants";
import { getDefaultResponseFormat } from "../../../../../../../../utils/response";

export function useInitialResponseFormat(detectedContentType: string | null, headerContentType: string): ResponseBodyFormatViewData {
  return useMemo<ResponseBodyFormatViewData>(() => {
    if (detectedContentType === null) {
      return { format: 'raw', view: 'editor' };
    }

    return getDefaultResponseFormat
    (headerContentType || detectedContentType);
  }, [detectedContentType, headerContentType]);
}