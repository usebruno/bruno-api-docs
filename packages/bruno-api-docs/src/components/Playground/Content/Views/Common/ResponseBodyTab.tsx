import React, { useMemo } from 'react';
import CodeEditor from '../../../../../ui/CodeEditor/CodeEditor';
import { detectContentTypeFromBase64, getContentType, ResponseBodyFormat } from '../../../../../utils/response';
import { RunRequestResponse } from '../../../../../runner';
import { QueryResultPreview } from '../../../QueryResult/QueryResult';

interface ResponseBodyTabProps {
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
}

const ResponseBodyTab: React.FC<ResponseBodyTabProps> = ({ response, selectedFormat, showPreview }) => {
  const contentType = useMemo(
    () => detectContentTypeFromBase64(response.base64Data) ?? getContentType(response.headers),
    [response.base64Data, response.headers]
  )
  // The runner parses JSON responses into objects; the editor needs a string.
  const editorValue =
    response?.data == null
      ? ''
      : typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

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
          language={selectedFormat}
          height="100%"
          readOnly={true}
        />
      )}
    </div>
  );
};

export default ResponseBodyTab;
