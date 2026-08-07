import React from 'react';
import cx from '../../utils/cx';
import { getMethodColorVar } from '../../theme/methodColors';
import { StyledWrapper } from './StyledWrapper';

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className }) => {
  const resolvedMethod = method || 'GET';
  const asWritten = resolvedMethod !== resolvedMethod.toLowerCase() && resolvedMethod !== resolvedMethod.toUpperCase();

  return (
    <StyledWrapper
      className={cx('method-badge', { 'method-badge--as-written': asWritten }, className)}
      style={{ color: getMethodColorVar(method) }}
    >
      {asWritten ? resolvedMethod : resolvedMethod.toUpperCase()}
    </StyledWrapper>
  );
};

export default MethodBadge;
