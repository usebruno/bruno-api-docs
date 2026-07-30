import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseBodyFormat } from '../../../../../../../../constants';
import { useInitialResponseFormat } from './useInitialResponseFormat';
import type { RunRequestResponse } from '../../../../../../../../runner';
import { getResponseFormatOptions } from '../../../../../../../../utils/response';

export function useResponseFormatter(
  response: RunRequestResponse
) {
  const { format, view, detectedContentType, headerContentType, contentType } = useInitialResponseFormat(response);
  const allowedFormats = useMemo(
    () => getResponseFormatOptions(detectedContentType, headerContentType),
    [detectedContentType, headerContentType]
  );
  const [userSelectedFormat, setUserSelectedFormat] = useState<ResponseBodyFormat>();
  const [showPreview, setShowPreview] = useState(view === 'preview');

  const previousViewRef = useRef(view);
  useEffect(() => {
    if (previousViewRef.current !== view) {
      previousViewRef.current = view;
      setShowPreview(view === 'preview');
    }
  }, [view]);

  const handleFormatChange = useCallback((format: ResponseBodyFormat) => {
    setUserSelectedFormat(format);
  }, []);

  const toggleView = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  return useMemo(() => {
    // A user's chosen format wins, but a stale choice that no longer applies to the current
    // body (e.g. 'json' held while the content-type turned binary) is ignored in favour of
    // the detected default.
    const selectedFormat
      = userSelectedFormat && allowedFormats.includes(userSelectedFormat) ? userSelectedFormat : format;
    return {
      selectedFormat,
      showPreview,
      handleFormatChange,
      toggleView,
      contentType,
      allowedFormats
    };
  }, [handleFormatChange, toggleView, format, userSelectedFormat, allowedFormats, showPreview, contentType]);
}
