import React from 'react';
import type { GrpcMethodType } from '@opencollection/types/requests/grpc';
import {
  UnaryIcon,
  ServerStreamingIcon,
  ClientStreamingIcon,
  BidiStreamingIcon
} from '../../../assets/icons';
import { StyledWrapper } from './StyledWrapper';

// Method types borrow the HTTP method colours instead of defining their own, so
// both themes stay in step without new tokens. The Bruno app does the same, except
// it colours client-streaming as POST; here it follows the design's cyan.
const ICON_BY_METHOD_TYPE: Record<string, { icon: React.FC; color: string }> = {
  'unary': { icon: UnaryIcon, color: 'var(--oc-request-methods-get)' },
  'server-streaming': { icon: ServerStreamingIcon, color: 'var(--oc-request-methods-put)' },
  'client-streaming': { icon: ClientStreamingIcon, color: 'var(--oc-request-methods-head)' },
  'bidi-streaming': { icon: BidiStreamingIcon, color: 'var(--oc-request-methods-post)' }
};

interface GrpcMethodTypeIconProps {
  methodType?: GrpcMethodType;
  className?: string;
}

export const GrpcMethodTypeIcon: React.FC<GrpcMethodTypeIconProps> = ({ methodType, className }) => {
  const entry = methodType ? ICON_BY_METHOD_TYPE[methodType] : undefined;
  if (!entry) return null;

  const Icon = entry.icon;
  return (
    <StyledWrapper className={className} style={{ color: entry.color }}>
      <Icon />
    </StyledWrapper>
  );
};
