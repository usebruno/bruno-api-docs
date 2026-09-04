import React from 'react';
import { CloseIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

export interface ErrorBannerProps {
  title: string;
  message: string;
  /** Optional one-line "what to do next" guidance shown beneath the message. */
  hint?: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Danger banner for a failed try-it request: bold title, monospace message,
 * and an optional next-step hint. Mirrors Bruno desktop's response error banner.
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({ title, message, hint, onDismiss, className = '' }) => (
  <StyledWrapper className={className} data-testid="error-banner">
    {onDismiss ? (
      <button
        type="button"
        className="error-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
        data-testid="error-banner-dismiss"
      >
        <CloseIcon />
      </button>
    ) : null}
    <div className="error-title" data-testid="error-title">{title}</div>
    <div className="error-message" data-testid="error-message">{message}</div>
    {hint ? <div className="error-hint" data-testid="error-hint">{hint}</div> : null}
  </StyledWrapper>
);

export default ErrorBanner;
