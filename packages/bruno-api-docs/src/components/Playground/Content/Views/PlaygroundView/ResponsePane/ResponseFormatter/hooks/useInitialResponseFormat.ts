import { useMemo } from "react";
import { ResponseBodyFormatViewData } from "../../../../../../../../constants";
import { detectContentTypeFromBase64, getDefaultResponseFormat, getContentType } from "../../../../../../../../utils/response";
import { RunRequestResponse } from "../../../../../../../../runner";

interface InitialResponseFormatData extends ResponseBodyFormatViewData {
  detectedContentType: string | null;
  headerContentType: string;
  contentType: string;
}

export function useInitialResponseFormat(response: RunRequestResponse): InitialResponseFormatData {
  const detectedContentType = useMemo(
      () => detectContentTypeFromBase64(response?.base64Data),
      [response?.base64Data]
    );
  const headerContentType = useMemo(() => getContentType(response?.headers), [response?.headers]);
  const contentType = detectedContentType ?? headerContentType;

  const initialFormatViewData = useMemo<ResponseBodyFormatViewData>(() => {
    if (detectedContentType === null) {
      return { format: 'raw', view: 'editor' };
    }

    return getDefaultResponseFormat
    (headerContentType || detectedContentType);
  }, [detectedContentType, headerContentType]);

  return useMemo(() => ({
    ...initialFormatViewData,
    detectedContentType,
    headerContentType,
    contentType
  }), [initialFormatViewData, detectedContentType, headerContentType, contentType]);
}