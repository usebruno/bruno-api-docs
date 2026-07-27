import React from 'react';
import { formatBytes } from '../../../../../../utils/exampleResponse';
import CopyButton from '../../../../../../ui/CopyButton/CopyButton';
import { StyledWrapper } from './StyledWrapper';

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

interface LargeResponseWarningProps {
  responseSize: number;
  onReveal: () => void;
  data?: unknown;
}

export const LargeResponseWarning: React.FC<LargeResponseWarningProps> = ({ responseSize, onReveal, data }) => {
  const copyText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <StyledWrapper data-testid="large-response-warning">
      <div className="large-response-title">Large Response Warning</div>
      <div className="large-response-description">
        Handling responses over{' '}
        <span className="large-response-size">{formatBytes(LARGE_RESPONSE_THRESHOLD)}</span> could degrade performance.
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
        <CopyButton text={copyText} label="Copy response" testId="large-response-copy" />
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
