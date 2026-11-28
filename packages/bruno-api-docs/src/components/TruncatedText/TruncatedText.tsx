import React, { type ReactNode } from 'react';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { StyledWrapper } from './StyledWrapper';

export interface TruncatedTextProps {
  text: string;
  children?: ReactNode;
  touch?: boolean;
  multilineTooltip?: boolean;
  className?: string;
  testId?: string;
}

const isOverflowing = (el: HTMLElement): boolean =>
  el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;

const alwaysOpen = (): boolean => true;

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  children,
  touch,
  multilineTooltip,
  className,
  testId = 'truncated-text'
}) => {
  const hasLineBreaks = multilineTooltip && text.includes('\n');

  return (
    <Tooltip
      content={text}
      disabled={!text.trim()}
      shouldOpen={hasLineBreaks ? alwaysOpen : isOverflowing}
      touch={touch}
      multiline={multilineTooltip}
    >
      <StyledWrapper className={['oc-truncate', className].filter(Boolean).join(' ')} data-testid={testId}>
        {children ?? text}
      </StyledWrapper>
    </Tooltip>
  );
};

export default TruncatedText;
