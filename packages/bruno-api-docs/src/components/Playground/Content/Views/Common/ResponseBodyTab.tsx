import React, { useMemo, useRef, useState } from 'react';
import { ResponseBodyFormat } from '../../../../../utils/response';
import { formatResponse } from '../../../../../utils/dataFormatter';
import { RunRequestResponse } from '../../../../../runner';
import { QueryResultPreview } from '../../../QueryResult/QueryResult';
import LargeResponseWarning from './LargeResponseWarning/LargeResponseWarning';

const CodeEditor = React.lazy(() => import('../../../../../ui/CodeEditor/CodeEditor'));

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

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
  const responseSize =
    typeof response?.size === 'number'
      ? response.size
      : response?.base64Data
        ? Math.floor(response.base64Data.length * 0.75) // base64 is ~4/3 of the raw bytes
        : 0;
  const isLargeResponse = responseSize > LARGE_RESPONSE_THRESHOLD;

  // Reset the reveal whenever a new response arrives, derived during render (no
  // useEffect): compare the incoming response against the previous object.
  const [revealed, setRevealed] = useState(false);
  const prevResponseRef = useRef(response);
  if (prevResponseRef.current !== response) {
    prevResponseRef.current = response;
    if (revealed) setRevealed(false);
  }

  const hideForLargeResponse = isLargeResponse && !revealed;

  // The editor isn't mounted while the preview is showing, so skip the full-body
  // decode + prettify until the editor view is actually active. Also skip it
  // while a large response is gated, to avoid decoding a 10MB+ body up front.
  const editorValue = useMemo(
    () =>
      showPreview || hideForLargeResponse
        ? ''
        : formatResponse(response?.data, response?.base64Data ?? '', selectedFormat),
    [response?.data, response?.base64Data, selectedFormat, showPreview, hideForLargeResponse]
  );

  // The tab-panel is height-constrained; own the scroll here so a tall body
  // (e.g. a large JSON tree) scrolls within the response area instead of
  // overflowing and being clipped.
  return (
    <div className="h-full overflow-auto">
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
