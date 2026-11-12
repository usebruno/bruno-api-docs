import { useCallback, useMemo } from 'react';
import type { ResponseBodyFormat } from '@usebruno/api-shared/constants';
import { useInitialResponseFormat } from './useInitialResponseFormat';
import type { RunRequestResponse } from '@usebruno/api-shared/types/run';
import { getResponseFormatOptions } from '@usebruno/api-shared/utils/response';
import { useSession } from '@usebruno/api-shared/session/session';
import { useObservable } from '@usebruno/api-shared/observable/observable';
import { selectedUuid } from '@usebruno/api-shared/session/playground';

export function useResponseFormatter(
  response: RunRequestResponse
) {
  const { selection, responseFormat, responsePreview } = useSession().playground;
  const selectedItemId = useObservable(selection, selectedUuid);
  const forSelected = <V>(byUuid: Record<string, V>) => (selectedItemId ? byUuid[selectedItemId] : null);
  const selectedResponseFormat = useObservable(responseFormat, forSelected);
  const showResponsePreview = useObservable(responsePreview, forSelected);
  const { format, view, detectedContentType, headerContentType, contentType } = useInitialResponseFormat(response);

  const allowedFormats = useMemo(
    () => getResponseFormatOptions(detectedContentType, headerContentType),
    [detectedContentType, headerContentType]
  );

  const handleFormatChange = useCallback((format: ResponseBodyFormat) => {
    responseFormat.setEntry(selectedItemId, format);
  }, [responseFormat, selectedItemId]);

  const toggleView = useCallback(() => {
    const currentlyPreview = showResponsePreview != null ? showResponsePreview : view === 'preview';
    responsePreview.setEntry(selectedItemId, !currentlyPreview);
  }, [responsePreview, selectedItemId, view, showResponsePreview]);

  return useMemo(() => {
    // A user's chosen format wins, but a stale choice that no longer applies to the current
    // body (e.g. 'json' held while the content-type turned binary) is ignored in favour of
    // the detected default.
    const selectedFormat
      = selectedResponseFormat && allowedFormats.includes(selectedResponseFormat) ? selectedResponseFormat : format;
    return {
      selectedFormat,
      showPreview: (
        showResponsePreview != null
          ? showResponsePreview
          : view === 'preview'
      ),
      handleFormatChange,
      toggleView,
      contentType,
      allowedFormats
    };
  }, [
    handleFormatChange,
    toggleView,
    format,
    selectedResponseFormat,
    allowedFormats,
    showResponsePreview,
    contentType,
    view
  ]);
}
