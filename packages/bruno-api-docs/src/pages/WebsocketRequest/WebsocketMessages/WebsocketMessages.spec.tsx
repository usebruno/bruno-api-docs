import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import type { WebSocketMessageEntry } from '@/utils/schemaHelpers';
import { WebsocketMessages } from './WebsocketMessages';

const entries = (count: number): WebSocketMessageEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    title: `Message ${index + 1}`,
    type: 'json',
    data: `{"payload":"body-${index + 1}"}`
  }));

describe('WebsocketMessages', () => {
  it('renders nothing when there are no messages', () => {
    const root = useRenderToDom(<WebsocketMessages messages={[]} />);
    expect(queryByTestId(root, 'websocket-messages')).toBeNull();
  });

  it('opens the first message and leaves the rest closed', () => {
    const root = useRenderToDom(<WebsocketMessages messages={entries(3)} />);
    expect(getByTestId(root, 'websocket-messages-card-0-code').text).toContain('body-1');
    expect(queryByTestId(root, 'websocket-messages-card-1-code')).toBeNull();
    expect(queryByTestId(root, 'websocket-messages-card-2-code')).toBeNull();
  });

  it('shows only the first three messages and offers to show more', () => {
    const root = useRenderToDom(<WebsocketMessages messages={entries(6)} />);
    expect(getByTestId(root, 'websocket-messages-card-2-title').text).toBe('Message 3');
    expect(queryByTestId(root, 'websocket-messages-card-3')).toBeNull();
    expect(getByTestId(root, 'websocket-messages-show-toggle').text).toContain('Show more');
  });

  it('offers no show-more control when everything already fits', () => {
    const root = useRenderToDom(<WebsocketMessages messages={entries(3)} />);
    expect(queryByTestId(root, 'websocket-messages-show-toggle')).toBeNull();
  });
});
