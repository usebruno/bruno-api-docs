import React from 'react';
import type { InheritedSource } from '../../utils/request';
import { Tooltip } from '../../ui/Tooltip/Tooltip';
import { GoToIcon } from '../../assets/icons';
import { cx } from '../../utils/cx';
import { StyledWrapper } from './StyledWrapper';

interface InheritedSourceLinkProps {
  source: InheritedSource;
  onNavigate?: (uuid: string) => void;
  testId?: string;
}

export const InheritedSourceLink: React.FC<InheritedSourceLinkProps> = ({
  source,
  onNavigate,
  testId = 'inherited-source'
}) => {
  const tooltip = `Inherited from ${source.level}: ${source.name}`;
  const canNavigate = Boolean(onNavigate && source.uuid);
  const className = cx('inherited-source', { 'inherited-source--static': !canNavigate });

  const trigger = canNavigate ? (
    <StyledWrapper
      type="button"
      className={className}
      aria-label={tooltip}
      data-testid={testId}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate!(source.uuid);
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <GoToIcon />
    </StyledWrapper>
  ) : (
    // Non-interactive fallback: role="img" so the source is still announced (a bare span with an
    // aria-label is ignored by screen readers).
    <StyledWrapper as="span" role="img" className={className} aria-label={tooltip} data-testid={testId}>
      <GoToIcon />
    </StyledWrapper>
  );

  return <Tooltip content={tooltip}>{trigger}</Tooltip>;
};

export default InheritedSourceLink;
