import React from 'react';
import { cx } from '../../utils/cx';
import { StyledWrapper } from './StyledWrapper';

interface ContentTypeBadgeProps {
  label: string;
  className?: string;
  onClick?: () => void;
  title?: string;
  testId?: string;
}

export const ContentTypeBadge: React.FC<ContentTypeBadgeProps> = ({ label, className, onClick, title, testId }) => {
  const interactive = Boolean(onClick);
  return (
    <StyledWrapper
      className={cx('content-type-badge', { 'content-type-badge--interactive': interactive }, className)}
      title={title}
      data-testid={testId}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
    >
      {label}
    </StyledWrapper>
  );
};

export default ContentTypeBadge;
