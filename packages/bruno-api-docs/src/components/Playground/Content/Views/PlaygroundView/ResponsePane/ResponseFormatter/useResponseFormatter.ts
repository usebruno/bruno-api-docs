import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResponseBodyFormat, useInitialResponseFormat } from '../../../../../../../utils/response';

export function useResponseFormatter(
  detectedContentType: string | null,
  headerContentType: string,
  allowedFormats: ResponseBodyFormat[]
) {
  const { format, view } = useInitialResponseFormat(detectedContentType, headerContentType);
  const [userSelectedFormat, setUserSelectedFormat] = useState<ResponseBodyFormat>();
  const [showPreview, setShowPreview] = useState(view === 'preview');

  // Re-derive the preview toggle only when the detected view actually changes (a new
  // content-type), so a manual toggle survives same-response re-renders.
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

  const handleViewChange = useCallback((showPreview: boolean) => {
    setShowPreview(showPreview);
  }, []);

  return useMemo(() => {
    // A user's chosen format wins, but a stale choice that no longer applies to the current
    // body (e.g. 'json' held while the content-type turned binary) is ignored in favour of
    // the detected default.
    const selectedFormat =
      userSelectedFormat && allowedFormats.includes(userSelectedFormat) ? userSelectedFormat : format;
    return {
      selectedFormat,
      showPreview,
      handleFormatChange,
      handleViewChange
    };
  }, [handleFormatChange, handleViewChange, format, userSelectedFormat, allowedFormats, showPreview]);
}
