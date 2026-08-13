import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { GrpcMethodTypeIcon } from './GrpcMethodTypeIcon';

describe('GrpcMethodTypeIcon', () => {
  it.each([
    ['unary', 'get'],
    ['server-streaming', 'put'],
    ['client-streaming', 'head'],
    ['bidi-streaming', 'post']
  ])('colours %s from the %s method variable', (methodType, token) => {
    const root = useRenderToDom(<GrpcMethodTypeIcon methodType={methodType as never} />);
    const icon = getByTestId(root, 'grpc-method-type-icon');
    expect(icon.attributes.style).toContain(`var(--oc-request-methods-${token})`);
    expect(icon.querySelector('svg')).not.toBeNull();
  });

  it('renders nothing when the method type is absent', () => {
    const root = useRenderToDom(<GrpcMethodTypeIcon />);
    expect(queryByTestId(root, 'grpc-method-type-icon')).toBeNull();
  });

  it.each(['toString', 'constructor', 'hasOwnProperty', '__proto__'])(
    'renders nothing for a methodType named %s instead of crashing',
    (methodType) => {
      const root = useRenderToDom(<GrpcMethodTypeIcon methodType={methodType as never} />);
      expect(queryByTestId(root, 'grpc-method-type-icon')).toBeNull();
    }
  );
});
