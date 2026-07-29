import React from 'react';
import { formatBytes } from '../../../../../../utils/exampleResponse';
import { StyledWrapper } from './StyledWrapper';

const LARGE_RESPONSE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

interface LargeResponseWarningProps {
  responseSize: number;
  onReveal: () => void;
}

export const LargeResponseWarning: React.FC<LargeResponseWarningProps> = ({ responseSize, onReveal }) => {
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
      </div>
    </StyledWrapper>
  );
};

export default LargeResponseWarning;
