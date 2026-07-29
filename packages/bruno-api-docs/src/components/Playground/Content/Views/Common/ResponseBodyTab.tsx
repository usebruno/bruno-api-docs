import React, { useMemo } from 'react';
import { type ResponseBodyFormat, FORMAT_TO_MONACO } from '../../../../../constants';
import { formatResponse } from '../../../../../utils/dataFormatter';
import type { RunRequestResponse } from '../../../../../runner';
import LargeResponseWarning from './LargeResponseWarning/LargeResponseWarning';
import useLargeResponse from '../../../../../hooks/useLargeResponseWarning';
import QueryResultPreview from '../../../QueryResultPreview/QueryResultPreview';

const CodeEditor = React.lazy(() => import('../../../../../ui/CodeEditor/CodeEditor'));

interface ResponseBodyTabProps {
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
  contentType: string;
}

const ResponseBodyTab: React.FC<ResponseBodyTabProps> = ({ response, selectedFormat, showPreview, contentType }) => {
  const { hideForLargeResponse, responseSize, setRevealed } = useLargeResponse(response);

  const editorValue = useMemo(
    () =>
      showPreview || hideForLargeResponse
        ? ''
        : formatResponse(response?.data, response?.base64Data ?? '', selectedFormat),
    [response?.data, response?.base64Data, selectedFormat, showPreview, hideForLargeResponse]
  );

  return (
    <div className="h-full">
      {hideForLargeResponse ? (
        <LargeResponseWarning
          responseSize={responseSize}
          onReveal={() => setRevealed(true)}
        />
      ) : showPreview ? (
        <QueryResultPreview
          selectedFormat={selectedFormat}
          data={response?.data}
          contentType={contentType}
          dataBuffer={response?.base64Data}
          baseUrl={response?.url}
        />
      ) : (
        <React.Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading editor...</div>}>
          <CodeEditor
            value={editorValue}
            onChange={() => {}} // Read-only
            language={FORMAT_TO_MONACO[selectedFormat]}
            height="100%"
            readOnly={true}
            testId="response-body-editor"
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default ResponseBodyTab;
