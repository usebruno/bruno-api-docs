import React, { useCallback } from 'react';
import { formatBytes } from '@/utils/exampleResponse';
import CopyButton from '@/ui/CopyButton/CopyButton';
import type { RunRequestResponse } from '@/runner';
import { downloadResponse } from '@/utils/downloadResponse';
import { StyledWrapper } from './StyledWrapper';
import { IconAlertTriangle } from '@tabler/icons';

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
          View
        </button>
        <CopyButton
          getText={dataToCopy}
          label="Copy"
          copiedLabel="Copied"
          testId="large-response-copy"
        />
        <button
          type="button"
          className="large-response-download"
          onClick={() => downloadResponse(response)}
          disabled={!response?.base64Data}
          aria-label="Download response"
          data-testid="large-response-download"
        >
          Download
        </button>
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
