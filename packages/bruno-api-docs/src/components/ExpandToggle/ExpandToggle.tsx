import React from 'react';
import cx from '@/utils/cx';
import { ChevronDownIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

interface ExpandToggleProps {
  expanded: boolean;
  moreLabel: string;
  lessLabel: string;
  onToggle: () => void;
  controls?: string;
  className?: string;
  testId?: string;
}

export const ExpandToggle: React.FC<ExpandToggleProps> = ({
  expanded,
  moreLabel,
  lessLabel,
  onToggle,
  controls,
  className,
  testId
}) => (
  <StyledWrapper
    type="button"
    className={cx('expand-toggle', className)}
    aria-expanded={expanded}
    aria-controls={controls}
    data-testid={testId}
    onClick={onToggle}
  >
    <span>{expanded ? lessLabel : moreLabel}</span>
    <ChevronDownIcon size={14} className="expand-toggle-chevron" />
  </StyledWrapper>
);

export default ExpandToggle;
