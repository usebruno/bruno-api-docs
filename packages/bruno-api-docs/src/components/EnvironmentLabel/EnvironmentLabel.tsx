import React from 'react';
import { TruncatedText } from '@/components/TruncatedText/TruncatedText';
import cx from '@/utils/cx';
import { StyledWrapper } from './StyledWrapper';

interface EnvironmentLabelProps {
  name: string;
  color?: string;
  className?: string;
  nameClassName?: string;
  truncate?: boolean;
  testId?: string;
}

export const EnvironmentLabel: React.FC<EnvironmentLabelProps> = ({
  name,
  color,
  className,
  nameClassName,
  truncate = false,
  testId
}) => (
  <StyledWrapper className={cx('environment-label', className)} data-testid={testId}>
    <span
      className={cx('environment-label-dot', { 'environment-label-dot--empty': !color })}
      style={color ? { background: color } : undefined}
    />
    {truncate ? (
      <TruncatedText
        text={name}
        className={cx('environment-label-name', 'environment-label-name--clamped', nameClassName)}
      />
    ) : (
      <span className={cx('environment-label-name', nameClassName)}>{name}</span>
    )}
  </StyledWrapper>
);

export default EnvironmentLabel;
