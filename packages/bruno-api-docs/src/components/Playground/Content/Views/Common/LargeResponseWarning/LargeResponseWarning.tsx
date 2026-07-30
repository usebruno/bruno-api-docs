import React, { useCallback } from 'react';
import { formatBytes } from '@/utils/exampleResponse';
import type { RunRequestResponse } from '@/runner';
import { downloadResponse } from '@/utils/downloadResponse';
import { StyledWrapper } from './StyledWrapper';
import { IconAlertTriangle, IconCheck, IconCopy, IconDownload, IconEye } from '@tabler/icons';
import useCopy from '@/hooks/useCopy';

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

interface LargeResponseWarningProps {
  responseSize: number;
  onReveal: () => void;
  response: RunRequestResponse;
}

export const LargeResponseWarning: React.FC<LargeResponseWarningProps> = ({ responseSize, onReveal, response }) => {
  const dataToCopy = useCallback(() => {
    const data = response?.data;
    return typeof data === 'string' ? data : JSON.stringify(data ?? '', null, 2);
  }, [response?.data]);

  const { copied, copyResponse } = useCopy({
    getText: dataToCopy
  });

  return (
    <StyledWrapper data-testid="large-response-warning">
      <div className="warning-icon">
        <IconAlertTriangle size={45} strokeWidth={2} />
      </div>
      <div className="large-response-title">Large Response Warning</div>
      <div className="large-response-description">
        Handling responses over{' '}
        <span className="large-response-threshold">{formatBytes(LARGE_RESPONSE_THRESHOLD)}</span> could degrade performance.
        <br />
        Size of current response:{' '}
        <span className="large-response-size">{formatBytes(responseSize)}</span>
      </div>
      <div className="large-response-actions">
        <button
          type="button"
          className="large-response-view"
          onClick={onReveal}
          aria-label="View response"
          data-testid="large-response-view"
        >
          <span className="button-icon">
            <IconEye size={13} strokeWidth={1} />
          </span>
          <span>View</span>
        </button>
        <button
          type="button"
          className="large-response-copy"
          onClick={copyResponse}
          aria-label={copied ? 'Copied response' : 'Copy response'}
          data-testid="large-response-copy"
        >
          <span className="button-icon">
            {copied ? <IconCheck size={13} strokeWidth={1} /> : <IconCopy size={13} strokeWidth={1} />}
          </span>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <button
          type="button"
          className="large-response-download"
          onClick={() => downloadResponse(response)}
          disabled={!response?.base64Data}
          aria-label="Download response"
          data-testid="large-response-download"
        >
          <span className="button-icon">
            <IconDownload size={13} strokeWidth={1} />
          </span>
          <span>Download</span>
        </button>
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
