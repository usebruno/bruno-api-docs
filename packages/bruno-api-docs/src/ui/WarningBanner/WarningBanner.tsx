import React from 'react';
import { StyledWrapper } from './StyledWrapper';

export interface WarningBannerProps {
  warnings: string[];
  className?: string;
}

const WarningBanner: React.FC<WarningBannerProps> = ({ warnings, className = '' }) => {
  if (!warnings.length) return null;

  return (
    <StyledWrapper className={className} data-testid="warning-banner">
      <div className="warning-title" data-testid="warning-title">
        {warnings.length > 1 ? 'Warnings' : 'Warning'}
      </div>
      {warnings.map((warning) => (
        <div key={warning} className="warning-message" data-testid="warning-message">
          {warning}
        </div>
      ))}
    </StyledWrapper>
  );
};

export default WarningBanner;
