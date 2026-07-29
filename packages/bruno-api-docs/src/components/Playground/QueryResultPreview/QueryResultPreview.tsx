import React, { useState } from 'react';
import HtmlPreview from './HtmlPreview/HtmlPreview';
import JsonPreview from './JsonPreview';
import TextPreview from './TextPreview';
import XmlPreview from './XmlPreview/XmlPreview';
import type { RunRequestResponse } from '../../../runner';
import { StyledWrapper } from './StyledWrapper';
import type { ResponseBodyFormat } from '../../../constants';
import { formatToPreviewMode } from '../../../constants';

// react-pdf (pdfjs) and react-player are large and only needed for binary previews,
// so load them on demand to keep them out of the initial bundle.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
const VideoPreview = React.lazy(() => import('./VideoPreview/VideoPreview'));
const PdfDocument = React.lazy(() =>
  import('react-pdf').then((module) => {
    // Point pdf.js at its bundled worker; without this it falls back to a fake worker.
    module.pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    return { default: module.Document };
  })
);
const PdfPage = React.lazy(() => import('react-pdf').then((module) => ({ default: module.Page })));

export interface QueryResultPreviewProps {
  data: RunRequestResponse['data'];
  selectedFormat: ResponseBodyFormat;
  /** Base URL used to resolve relative links/resources in the HTML preview. */
  baseUrl?: string;
  dataBuffer?: RunRequestResponse['base64Data'];
  contentType: string;
}

const QueryResultPreview: React.FC<QueryResultPreviewProps> = ({
  data,
  contentType,
  dataBuffer,
  selectedFormat,
  baseUrl
}) => {
  const previewMode = formatToPreviewMode(selectedFormat, contentType);
  const [pdfPagesNum, setPdfPagesNum] = useState<number | null>(null);

  const handleDocumentLoad = ({ numPages }: { numPages: number }) => {
    setPdfPagesNum(numPages);
  };

  switch (previewMode) {
    case 'preview-web': {
      return <HtmlPreview data={data} baseUrl={baseUrl} />;
    }
    case 'preview-image': {
      return <img src={`data:${contentType.split(';')[0].trim()};base64,${dataBuffer}`} />;
    }
    case 'preview-pdf': {
      return (
        <React.Suspense fallback={<div className="p-4 text-center">Loading PDF…</div>}>
          <StyledWrapper className="preview-pdf">
            <PdfDocument file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={handleDocumentLoad}>
              {Array.from(new Array(pdfPagesNum), (el, index) => (
                <PdfPage
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              ))}
            </PdfDocument>
          </StyledWrapper>
        </React.Suspense>
      );
    }
    case 'preview-audio': {
      return (
        <audio controls src={`data:${contentType.split(';')[0].trim()};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return (
        <React.Suspense fallback={<div className="p-4 text-center">Loading player…</div>}>
          <VideoPreview contentType={contentType} dataBuffer={dataBuffer as string} />
        </React.Suspense>
      );
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
