import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId, query } from '@/test-utils/dom';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import { WebsocketRequest } from './WebsocketRequest';

const wsItem = (data: Record<string, unknown>): WebSocketRequest => data as unknown as WebSocketRequest;

describe('WebsocketRequest', () => {
  it('renders the request name, the WS badge and the url', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({ info: { name: 'Live Updates', type: 'websocket' }, websocket: { url: 'wss://echo.websocket.org' } })}
      />
    );

    expect(getByTestId(root, 'websocket-request-title').text).toBe('Live Updates');
    expect(getByTestId(root, 'request-method').text).toBe('WS');
    expect(getByTestId(root, 'request-url').text).toContain('wss://echo.websocket.org');
  });

  it('renders a request that has no websocket block at all', () => {
    const root = useRenderToDom(
      <WebsocketRequest item={wsItem({ name: 'Bare Socket', type: 'websocket', url: '{{host}}/ws' })} />
    );

    expect(getByTestId(root, 'websocket-request-title').text).toBe('Bare Socket');
    expect(getByTestId(root, 'request-url').text).toContain('{{host}}/ws');
  });

  it('falls back to a placeholder name and never offers a Try button', () => {
    const root = useRenderToDom(<WebsocketRequest item={wsItem({ info: { type: 'websocket' }, websocket: {} })} />);

    expect(getByTestId(root, 'websocket-request-title').text).toBe('Untitled Request');
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  it('renders the docs markdown as html', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({
          info: { name: 'Live Updates', type: 'websocket' },
          websocket: { url: 'wss://x' },
          docs: '# Live Updates\n\nStreams order updates.'
        })}
      />
    );

    const markdown = query(getByTestId(root, 'websocket-request-description'), '.markdown-documentation');
    expect(query(markdown, 'h1').text).toBe('Live Updates');
    expect(query(markdown, 'p').text).toBe('Streams order updates.');
  });

  it('falls back to the description when there are no docs', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({ info: { name: 'Live Updates', type: 'websocket', description: 'Streams order updates.' } })}
      />
    );

    expect(getByTestId(root, 'websocket-request-description').text).toContain('Streams order updates.');
  });

  it('lists the messages in one section with a count', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({
          info: { name: 'Live Updates', type: 'websocket' },
          websocket: {
            url: 'wss://x',
            message: [
              { title: 'Subscribe', message: { type: 'json', data: '{"channel":"orders"}' } },
              { title: 'Ping', message: { type: 'text', data: 'ping' } }
            ]
          }
        })}
      />
    );

    expect(getByTestId(root, 'websocket-request-section-messages').text).toContain('2 messages');
    expect(getByTestId(root, 'websocket-request-messages-card-0-title').text).toBe('Subscribe');
    expect(getByTestId(root, 'websocket-request-messages-card-1-title').text).toBe('Ping');
    expect(queryByTestId(root, 'websocket-request-config-empty')).toBeNull();
  });

  it('lists the request headers alongside the ones it inherits', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({
          info: { name: 'Live Updates', type: 'websocket' },
          websocket: { url: 'wss://x', headers: [{ name: 'Accept', value: 'application/json' }] }
        })}
        collection={{ info: { name: 'Testbench' }, request: { headers: [{ name: 'X-Tenant', value: 'acme' }] } } as never}
      />
    );

    const section = getByTestId(root, 'websocket-request-section-headers');
    expect(section.text).toContain('Accept');
    expect(section.text).toContain('X-Tenant');
    expect(section.text).toContain('1 header inherited');
  });

  it('shows concrete auth with no inherited badge and masks the secret', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({
          info: { name: 'Live Updates', type: 'websocket' },
          websocket: { url: 'wss://x', auth: { type: 'basic', username: 'reader', password: 's3cret' } }
        })}
      />
    );

    const section = getByTestId(root, 'websocket-request-section-auth');
    expect(section.text).toContain('Basic Auth');
    expect(section.text).toContain('reader');
    expect(root.text).not.toContain('s3cret');
    expect(queryByTestId(root, 'websocket-request-auth-inherited')).toBeNull();
  });

  it('resolves inherited auth up to the collection and says where it came from', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({ info: { name: 'Live Updates', type: 'websocket' }, websocket: { url: 'wss://x', auth: 'inherit' } })}
        collection={{ info: { name: 'Testbench' }, request: { auth: { type: 'bearer', token: 'abc' } } } as never}
      />
    );

    expect(getByTestId(root, 'websocket-request-auth-inherited').text).toContain('Inherited from collection');
    expect(getByTestId(root, 'websocket-request-section-auth').text).toContain('Bearer Token');
  });

  it('shows the tags of a request that has no other configuration', () => {
    const root = useRenderToDom(
      <WebsocketRequest
        item={wsItem({ info: { name: 'Tagged', type: 'websocket', tags: ['realtime'] }, websocket: { url: 'wss://x' } })}
      />
    );

    expect(getByTestId(root, 'websocket-request-section-tags').text).toContain('realtime');
    expect(queryByTestId(root, 'websocket-request-config-empty')).not.toBeNull();
  });

  it('shows an empty state when nothing is configured', () => {
    const root = useRenderToDom(
      <WebsocketRequest item={wsItem({ info: { name: 'Bare', type: 'websocket' }, websocket: { url: 'wss://x' } })} />
    );

    expect(getByTestId(root, 'websocket-request-config-empty').text).toContain('No request configuration');
    expect(queryByTestId(root, 'websocket-request-section-messages')).toBeNull();
    expect(queryByTestId(root, 'websocket-request-section-headers')).toBeNull();
    expect(queryByTestId(root, 'websocket-request-section-auth')).toBeNull();
  });
});
