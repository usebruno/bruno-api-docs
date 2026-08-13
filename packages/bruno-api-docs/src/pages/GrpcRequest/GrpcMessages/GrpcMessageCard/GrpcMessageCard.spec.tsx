import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { GrpcMessageCard } from './GrpcMessageCard';

describe('GrpcMessageCard', () => {
  it('renders the title and the message when expanded', () => {
    const root = useRenderToDom(
      <GrpcMessageCard title="Message 1" message='{"sku":"SKU-1001"}' expanded onToggle={() => {}} />
    );

    expect(getByTestId(root, 'grpc-message-card-title').text).toBe('Message 1');
    expect(getByTestId(root, 'grpc-message-card-code').text).toContain('SKU-1001');
    expect(getByTestId(root, 'grpc-message-card-toggle').attributes['aria-expanded']).toBe('true');
  });

  it('renders the title but not the message when collapsed', () => {
    const root = useRenderToDom(
      <GrpcMessageCard title="Message 2" message='{"sku":"SKU-1002"}' expanded={false} onToggle={() => {}} />
    );

    expect(getByTestId(root, 'grpc-message-card-title').text).toBe('Message 2');
    expect(queryByTestId(root, 'grpc-message-card-code')).toBeNull();
    expect(getByTestId(root, 'grpc-message-card-toggle').attributes['aria-expanded']).toBe('false');
  });
});
