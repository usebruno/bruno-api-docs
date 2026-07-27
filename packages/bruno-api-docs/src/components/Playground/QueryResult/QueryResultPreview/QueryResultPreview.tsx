import React, { useState } from 'react';
import HtmlPreview from './HtmlPreview';
import JsonPreview from './JsonPreview';
import TextPreview from './TextPreview';
import XmlPreview from './XmlPreview/XmlPreview';
import { ResponseBodyFormat } from 'src/utils/response';
import { RunRequestResponse } from 'src/runner';
import { Document, Page } from 'react-pdf';
import VideoPreview from './VideoPreview/VideoPreview';
import { formatToPreviewMode } from './previewMode';

export interface QueryResultPreviewProps {
  /** The response body to preview. */
  data: unknown;
  /** How to render the data. */
  selectedFormat: ResponseBodyFormat;
  /** Base URL used to resolve relative links/resources in the HTML preview. */
  baseUrl?: string;
  dataBuffer?: RunRequestResponse['base64Data']
  contentType: string;
}

/**
 * Renders a response body preview. Ported from bruno-app's QueryResultPreview,
 * scoped to the modes feasible in a browser (HTML via sandboxed iframe, JSON,
 * XML, and plain text). Editor rendering stays in ResponseBodyTab's CodeEditor.
 */
const QueryResultPreview: React.FC<QueryResultPreviewProps> = ({ data, contentType, dataBuffer, selectedFormat, baseUrl }) => {
  const previewMode = formatToPreviewMode(selectedFormat, contentType);
  const [pdfPagesNum, setPdfPagesNum] = useState<number | null>(null)
  
  const handleDocumentLoad = ({ numPages }: { numPages: number }) => {
    setPdfPagesNum(numPages);
  }

  switch (previewMode) {
    case 'preview-web': {
      return <HtmlPreview data={data} baseUrl={baseUrl} />;
    }
    case 'preview-image': {
      return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} />;
    }
    case 'preview-pdf': {
      return (
        <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={handleDocumentLoad}>
            {Array.from(new Array(pdfPagesNum), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
            ))}
          </Document>
        </div>
      );
    }
    case 'preview-audio': {
      return (
        <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return <VideoPreview contentType={contentType} dataBuffer={dataBuffer as string} />;
    }
    case 'preview-json': {
      return <JsonPreview data={data} />;
    }

    case 'preview-text': {
      return <TextPreview data={data} />;
    }

    case 'preview-xml': {
      return <XmlPreview data={data} />;
    }

    default:
      return (
        <div className="p-4 flex flex-col items-center justify-center h-full text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            No Preview Available
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sorry, no preview is available for this content type.
          </div>
        </div>
      );
  }
};

export default QueryResultPreview;
