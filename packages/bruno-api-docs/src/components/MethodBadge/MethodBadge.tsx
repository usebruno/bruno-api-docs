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
  return (
    <StyledWrapper
      className={cx('method-badge', className)}
      style={{ color: getMethodColorVar(method) }}
    >
      {resolvedMethod.toUpperCase()}
    </StyledWrapper>
  );
};

export default MethodBadge;
