import React, { useMemo } from 'react';
import CodeEditor from '../../../../../ui/CodeEditor/CodeEditor';
import { ResponseBodyFormat } from '../../../../../utils/response';
import { formatResponse } from '../../../../../utils/dataFormatter';
import { RunRequestResponse } from '../../../../../runner';
import { QueryResultPreview } from '../../../QueryResult/QueryResult';

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
  // The editor isn't mounted while the preview is showing, so skip the full-body
  // decode + prettify until the editor view is actually active.
  const editorValue = useMemo(
    () => (showPreview ? '' : formatResponse(response?.data, response?.base64Data ?? '', selectedFormat)),
    [response?.data, response?.base64Data, selectedFormat, showPreview]
  );

  // The tab-panel is height-constrained; own the scroll here so a tall body
  // (e.g. a large JSON tree) scrolls within the response area instead of
  // overflowing and being clipped.
  return (
    <div className="h-full overflow-auto">
      {showPreview ? (
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
