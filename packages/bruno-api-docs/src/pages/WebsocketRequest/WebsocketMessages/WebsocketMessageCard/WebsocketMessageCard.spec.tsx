import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import { WebsocketMessageCard } from './WebsocketMessageCard';

const noop = () => {};

describe('WebsocketMessageCard', () => {
  it('shows the title and format, with the body hidden while collapsed', () => {
    const root = useRenderToDom(
      <WebsocketMessageCard title="Subscribe" type="json" data='{"a":1}' expanded={false} onToggle={noop} />
    );

    expect(getByTestId(root, 'websocket-message-card-title').text).toBe('Subscribe');
    expect(getByTestId(root, 'websocket-message-card-type').text).toBe('JSON');
    expect(getByTestId(root, 'websocket-message-card-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(queryByTestId(root, 'websocket-message-card-code')).toBeNull();
  });

  it('pretty-prints a JSON message and keeps its variables', () => {
    const root = useRenderToDom(
      <WebsocketMessageCard
        title="Subscribe"
        type="json"
        data='{"channel":"orders","token":"{{token}}"}'
        expanded
        onToggle={noop}
      />
    );

    const code = getByTestId(root, 'websocket-message-card-code').text;
    expect(code).toContain('"channel": "orders",\n  "token": "{{token}}"');
  });

  it('pretty-prints an XML message', () => {
    const root = useRenderToDom(
      <WebsocketMessageCard title="Order" type="xml" data="<order><id>1</id></order>" expanded onToggle={noop} />
    );

    expect(getByTestId(root, 'websocket-message-card-code').text).toContain('<order>\n    <id>1</id>\n</order>');
  });

  it('leaves a text message untouched', () => {
    const root = useRenderToDom(
      <WebsocketMessageCard title="Ping" type="text" data="  ping  " expanded onToggle={noop} />
    );

    expect(getByTestId(root, 'websocket-message-card-type').text).toBe('Text');
    expect(getByTestId(root, 'websocket-message-card-code').text).toContain('  ping  ');
  });
});
