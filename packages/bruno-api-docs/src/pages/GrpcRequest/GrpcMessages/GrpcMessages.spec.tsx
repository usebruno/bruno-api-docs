import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { GrpcMessages } from './GrpcMessages';

const entries = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    title: `Message ${index + 1}`,
    message: `{"payload":"body-${index + 1}"}`
  }));

describe('GrpcMessages', () => {
  it('renders nothing when there are no messages', () => {
    const root = useRenderToDom(<GrpcMessages messages={[]} />);
    expect(queryByTestId(root, 'grpc-messages')).toBeNull();
  });

  it('opens the first message and leaves the rest closed', () => {
    const root = useRenderToDom(<GrpcMessages messages={entries(3)} />);
    expect(getByTestId(root, 'grpc-messages-card-0-code').text).toContain('body-1');
    expect(queryByTestId(root, 'grpc-messages-card-1-code')).toBeNull();
    expect(queryByTestId(root, 'grpc-messages-card-2-code')).toBeNull();
  });

  it('shows only the first three messages and offers to show more', () => {
    const root = useRenderToDom(<GrpcMessages messages={entries(6)} />);
    expect(getByTestId(root, 'grpc-messages-card-2-title').text).toBe('Message 3');
    expect(queryByTestId(root, 'grpc-messages-card-3')).toBeNull();
    expect(getByTestId(root, 'grpc-messages-show-toggle').text).toContain('Show more');
  });

  it('offers no show-more control when everything already fits', () => {
    const root = useRenderToDom(<GrpcMessages messages={entries(2)} />);
    expect(queryByTestId(root, 'grpc-messages-show-toggle')).toBeNull();
  });
});
