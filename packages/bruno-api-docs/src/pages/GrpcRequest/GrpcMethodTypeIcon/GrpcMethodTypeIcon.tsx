import React from 'react';
import type { GrpcMethodType } from '@opencollection/types/requests/grpc';
import {
  UnaryIcon,
  ServerStreamingIcon,
  ClientStreamingIcon,
  BidiStreamingIcon
} from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

// Method types borrow the HTTP method colour tokens rather than defining their own, so both
// themes stay in step without new tokens. Client-streaming maps to the head colour, which is
// where this differs from the Bruno app's own mapping.
const ICON_BY_METHOD_TYPE: Record<string, { icon: React.FC<{ size?: number }>; color: string }> = {
  'unary': { icon: UnaryIcon, color: 'var(--oc-request-methods-get)' },
  'server-streaming': { icon: ServerStreamingIcon, color: 'var(--oc-request-methods-put)' },
  'client-streaming': { icon: ClientStreamingIcon, color: 'var(--oc-request-methods-head)' },
  'bidi-streaming': { icon: BidiStreamingIcon, color: 'var(--oc-request-methods-post)' }
};

interface GrpcMethodTypeIconProps {
  methodType?: GrpcMethodType;
  size?: number;
  className?: string;
  testId?: string;
}

export const GrpcMethodTypeIcon: React.FC<GrpcMethodTypeIconProps> = ({
  methodType,
  size = 16,
  className,
  testId = 'grpc-method-type-icon'
}) => {
  const entry
    = methodType && Object.prototype.hasOwnProperty.call(ICON_BY_METHOD_TYPE, methodType)
      ? ICON_BY_METHOD_TYPE[methodType]
      : undefined;
  if (!entry) return null;

  const Icon = entry.icon;
  return (
    <StyledWrapper className={className} style={{ color: entry.color }} data-testid={testId}>
      <Icon size={size} />
    </StyledWrapper>
  );
};

export default GrpcMethodTypeIcon;
