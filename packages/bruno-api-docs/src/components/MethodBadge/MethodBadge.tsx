import React from 'react';
import cx from '@/utils/cx';
import { getMethodColorVar } from '@/theme/methodColors';
import { StyledWrapper } from './StyledWrapper';

interface MethodBadgeProps {
  method: string;
  className?: string;
  capitalizeMethod?: boolean;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, className, capitalizeMethod = true }) => {
  const resolvedMethod = method || 'GET';

  return (
    <StyledWrapper
      className={cx('method-badge', { 'method-badge--as-written': !capitalizeMethod }, className)}
      style={{ color: getMethodColorVar(method) }}
    >
      {capitalizeMethod ? resolvedMethod.toUpperCase() : resolvedMethod}
    </StyledWrapper>
  );
};

export default MethodBadge;
