import { useCallback, useMemo } from 'react';
import type { ResponseBodyFormat } from '../../../../../../../../constants';
import { useInitialResponseFormat } from './useInitialResponseFormat';
import type { RunRequestResponse } from '../../../../../../../../runner';
import { getResponseFormatOptions } from '../../../../../../../../utils/response';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectResponseFormat,
  selectShowResponsePreview,
  selectSelectedItemId,
  setResponseFormat,
  setShowResponsePreview
} from '@/store/slices/playground';

export function useResponseFormatter(
  response: RunRequestResponse
) {
  const selectedItemId = useAppSelector(selectSelectedItemId);
  const selectedResponseFormat = useAppSelector(selectResponseFormat(selectedItemId));
  const showResponsePreview = useAppSelector(selectShowResponsePreview(selectedItemId));
  const dispatch = useAppDispatch();
  const { format, view, detectedContentType, headerContentType, contentType } = useInitialResponseFormat(response);

  const allowedFormats = useMemo(
    () => getResponseFormatOptions(detectedContentType, headerContentType),
    [detectedContentType, headerContentType]
  );

  const handleFormatChange = useCallback((format: ResponseBodyFormat) => {
    dispatch(setResponseFormat({
      uuid: selectedItemId,
      format
    }));
  }, [dispatch, selectedItemId]);

  const toggleView = useCallback(() => {
    const currentlyPreview = showResponsePreview != null ? showResponsePreview : view === 'preview';
    dispatch(setShowResponsePreview({
      uuid: selectedItemId,
      showResponsePreview: !currentlyPreview
    }));
  }, [dispatch, selectedItemId, view, showResponsePreview]);

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
