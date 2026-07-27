import React, { useMemo, useRef, useState } from 'react';
import { ResponseBodyFormat } from '../../../../../utils/response';
import { formatResponse } from '../../../../../utils/dataFormatter';
import { RunRequestResponse } from '../../../../../runner';
import { QueryResultPreview } from '../../../QueryResult/QueryResult';
import LargeResponseWarning from './LargeResponseWarning/LargeResponseWarning';
import useLargeResponse from '../../../../../hooks/useLargeResponseWarning';

const CodeEditor = React.lazy(() => import('../../../../../ui/CodeEditor/CodeEditor'));

interface ResponseBodyTabProps {
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
  contentType: string;
}

// The byte encodings (raw/hex/base64) aren't Monaco grammars; feed plaintext so
// the editor never receives a language it can't tokenise.
const FORMAT_TO_MONACO: Record<ResponseBodyFormat, string> = {
  json: 'json',
  xml: 'xml',
  html: 'html',
  javascript: 'javascript',
  raw: 'plaintext',
  hex: 'plaintext',
  base64: 'plaintext'
};

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
          data={response?.data}
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
        <CodeEditor
          value={editorValue}
          onChange={() => {}} // Read-only
          language={FORMAT_TO_MONACO[selectedFormat]}
          height="100%"
          readOnly={true}
          testId="response-body-editor"
        />
      )}
    </div>
  );
};

export default ResponseBodyTab;
