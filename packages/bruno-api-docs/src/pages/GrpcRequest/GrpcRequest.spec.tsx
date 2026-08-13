import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId, query } from '@/test-utils/dom';
import type { GrpcRequest as GrpcRequestItem } from '@opencollection/types/requests/grpc';
import { GrpcRequest } from './GrpcRequest';

const grpcItem = (data: Record<string, unknown>): GrpcRequestItem => data as unknown as GrpcRequestItem;

describe('GrpcRequest', () => {
  it('renders the request name, the GRPC badge and the url', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({ info: { name: 'Order Service', type: 'grpc' }, grpc: { url: 'grpc://localhost:50051' } })}
      />
    );

    expect(getByTestId(root, 'grpc-request-title').text).toBe('Order Service');
    expect(getByTestId(root, 'request-method').text).toBe('gRPC');
    expect(getByTestId(root, 'request-url').text).toContain('grpc://localhost:50051');
  });

  it('renders a request that has no grpc block at all', () => {
    const root = useRenderToDom(
      <GrpcRequest item={grpcItem({ name: 'Bare Method', type: 'grpc', url: '{{grpcUrl}}' })} />
    );

    expect(getByTestId(root, 'grpc-request-title').text).toBe('Bare Method');
    expect(getByTestId(root, 'request-url').text).toContain('{{grpcUrl}}');
  });

  it('falls back to a placeholder name and never offers a Try button', () => {
    const root = useRenderToDom(<GrpcRequest item={grpcItem({ info: { type: 'grpc' }, grpc: {} })} />);

    expect(getByTestId(root, 'grpc-request-title').text).toBe('Untitled Request');
    expect(queryByTestId(root, 'request-try-button')).toBeNull();
  });

  it('renders the docs markdown as html', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051' },
          docs: '# Order Service\n\nFetches a single order.'
        })}
      />
    );

    const description = getByTestId(root, 'grpc-request-description');
    const markdown = query(description, '.markdown-documentation');
    expect(query(markdown, 'h1').text).toBe('Order Service');
    expect(query(markdown, 'p').text).toBe('Fetches a single order.');
  });

  it('omits the description block when there are no docs', () => {
    const root = useRenderToDom(
      <GrpcRequest item={grpcItem({ info: { name: 'Chat', type: 'grpc' }, grpc: {} })} />
    );
    expect(queryByTestId(root, 'grpc-request-description')).toBeNull();
  });

  it('renders a request with a method', () => {
    const root = useRenderToDom(
      <GrpcRequest item={grpcItem({ info: { name: 'Test Request', type: 'grpc' }, grpc: { method: 'GetOrder' } })} />
    );
    expect(getByTestId(root, 'grpc-request-method').text).toContain('GetOrder');
  });

  it('renders the proto file name and the method with its type label', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Get Book', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:9000',
            protoFilePath: 'book.proto',
            method: '/com.bookstore.BookService/GetBook',
            methodType: 'unary'
          }
        })}
      />
    );

    expect(getByTestId(root, 'grpc-request-proto-file').text).toContain('book.proto');
    expect(getByTestId(root, 'grpc-request-method').text).toContain('com.bookstore.BookService/GetBook');
    expect(getByTestId(root, 'grpc-request-method-type').text).toBe('Unary');
  });

  it('hides the proto file path when the request uses reflection', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Get Book', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:50051',
            method: '/hello.HelloService/BidiHello',
            methodType: 'bidi-streaming'
          }
        })}
      />
    );

    expect(queryByTestId(root, 'grpc-request-section-proto-file')).toBeNull();
    expect(getByTestId(root, 'grpc-request-method-type').text).toBe('Bidirectional Streaming');
  });

  it('hides the method section when no method is selected', () => {
    const root = useRenderToDom(
      <GrpcRequest item={grpcItem({ name: 'Bare Method', type: 'grpc', url: '{{grpcUrl}}' })} />
    );

    expect(queryByTestId(root, 'grpc-request-section-method')).toBeNull();
    expect(getByTestId(root, 'grpc-request-title').text).toBe('Bare Method');
  });

  it('renders metadata rows with their descriptions and counts only enabled ones', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:50051',
            method: '/orders.OrderService/GetOrder',
            metadata: [
              { name: 'authorization', value: 'Bearer token', description: 'Auth token' },
              { name: 'x-request-id', value: 'req-001' },
              { name: 'x-legacy-flag', value: 'off', disabled: true }
            ]
          }
        })}
      />
    );

    const section = getByTestId(root, 'grpc-request-section-metadata');
    const names = section.querySelectorAll('[data-testid="table-cell-name"]').map((cell) => cell.text.trim());
    expect(names).toEqual(['authorization', 'x-request-id', 'x-legacy-flag']);
    expect(section.text).toContain('Auth token');
    expect(section.text).toContain('2 fields');
  });

  it('reads a metadata description given as an object', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Chat', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:50051',
            method: '/hello.HelloService/BidiHello',
            metadata: [{ name: 'x-client', value: 'Bruno', description: { content: 'Client name' } }]
          }
        })}
      />
    );

    const section = getByTestId(root, 'grpc-request-section-metadata');
    expect(section.text).toContain('Client name');
    expect(section.text).toContain('1 field');
  });

  it('hides the metadata section when there is none', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Stream Replies', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/hello.HelloService/LotsOfReplies' }
        })}
      />
    );
    expect(queryByTestId(root, 'grpc-request-section-metadata')).toBeNull();
  });

  it('shows concrete auth with no inherited badge', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Get Book', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:9000',
            method: '/com.book.BookService/GetBook',
            auth: { type: 'basic', username: 'reader', password: 's3cret' }
          }
        })}
      />
    );

    const section = getByTestId(root, 'grpc-request-section-auth');
    expect(section.text).toContain('Basic Auth');
    expect(section.text).toContain('reader');
    expect(queryByTestId(root, 'grpc-request-auth-inherited')).toBeNull();
  });

  it('resolves inherited auth up to the collection and says where it came from', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/orders.OrderService/GetOrder', auth: 'inherit' }
        })}
        collection={{ info: { name: 'Testbench' }, request: { auth: { type: 'bearer', token: 'abc' } } } as never}
      />
    );

    expect(getByTestId(root, 'grpc-request-auth-inherited').text).toContain('Inherited from collection');
    expect(getByTestId(root, 'grpc-request-section-auth').text).toContain('Bearer Token');
  });

  it('masks a secret rather than printing it', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Get Book', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:9000',
            method: '/com.book.BookService/GetBook',
            auth: { type: 'basic', username: 'reader', password: 's3cret' }
          }
        })}
      />
    );
    expect(root.text).not.toContain('s3cret');
  });

  it('hides the auth section when the request has no auth', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Chat', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/hello.HelloService/BidiHello' }
        })}
      />
    );
    expect(queryByTestId(root, 'grpc-request-section-auth')).toBeNull();
  });

  it('shows a single empty state when the request has no configuration', () => {
    const root = useRenderToDom(
      <GrpcRequest item={grpcItem({ name: 'Bare Method', type: 'grpc', url: '{{grpcUrl}}' })} />
    );

    expect(getByTestId(root, 'grpc-request-config-empty').text).toContain('No request configuration');
    expect(getByTestId(root, 'grpc-request-title').text).toBe('Bare Method');
  });

  it('builds a grpcurl snippet from the request', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:50051',
            method: '/orders.OrderService/GetOrder',
            methodType: 'unary',
            message: '{"orderId":"12345"}'
          }
        })}
      />
    );

    expect(getByTestId(root, 'grpc-request-code-snippet-tab-grpcurl').text).toBe('grpcURL');
    const code = getByTestId(root, 'grpc-request-code-snippet-code');
    expect(code.text).toContain('grpcurl');
    expect(code.text).toContain('localhost:50051');
    expect(code.text).toContain('orders.OrderService/GetOrder');
  });

  it('omits the code snippet when the request has no method', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Chat', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', metadata: [{ name: 'x-client', value: 'Bruno' }] }
        })}
      />
    );
    expect(queryByTestId(root, 'grpc-request-section-code-snippet')).toBeNull();
  });

  it('shows sections instead of the empty state when there is any configuration', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Stream Replies', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/hello.HelloService/LotsOfReplies' }
        })}
      />
    );

    expect(queryByTestId(root, 'grpc-request-config-empty')).toBeNull();
    expect(queryByTestId(root, 'grpc-request-section-method')).not.toBeNull();
  });

  it('offers a JavaScript snippet only when a proto file is attached', () => {
    const withProto = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Get Book', type: 'grpc' },
          grpc: {
            url: 'grpc://localhost:9000',
            method: '/com.book.BookService/GetBook',
            methodType: 'unary',
            protoFilePath: 'protos/book.proto'
          }
        })}
      />
    );
    expect(queryByTestId(withProto, 'grpc-request-code-snippet-tab-javascript')).not.toBeNull();

    const reflectionOnly = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/orders.OrderService/GetOrder', methodType: 'unary' }
        })}
      />
    );
    expect(queryByTestId(reflectionOnly, 'grpc-request-code-snippet-tab-grpcurl')).not.toBeNull();
    expect(queryByTestId(reflectionOnly, 'grpc-request-code-snippet-tab-javascript')).toBeNull();
  });
});

describe('GrpcRequest — execution context', () => {
  const useWithRuntime = (runtime: Record<string, unknown>) =>
    useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/orders.OrderService/GetOrder' },
          runtime
        })}
      />
    );

  it('renders an empty state when the request carries no runtime', () => {
    const root = useRenderToDom(
      <GrpcRequest
        item={grpcItem({
          info: { name: 'Order Service', type: 'grpc' },
          grpc: { url: 'grpc://localhost:50051', method: '/orders.OrderService/GetOrder' }
        })}
      />
    );

    const section = getByTestId(root, 'grpc-request-section-execution-context');
    expect(getByTestId(section, 'grpc-request-execution-context-empty').text).toContain('No execution context');
  });

  it('renders pre-request variables from the runtime block', () => {
    const root = useWithRuntime({ variables: [{ name: 'orderId', value: '12345' }] });
    expect(queryByTestId(root, 'grpc-request-execution-context-empty')).toBeNull();
    expect(getByTestId(root, 'grpc-request-section-execution-context').text).toContain('orderId');
  });

  it('renders post-response captures stored as actions', () => {
    const root = useWithRuntime({
      actions: [
        {
          type: 'set-variable',
          trigger: 'after-response',
          variable: { name: 'lastOrderStatus', scope: 'runtime' },
          selector: { expression: 'res.body.status' }
        }
      ]
    });
    expect(queryByTestId(root, 'grpc-request-execution-context-empty')).toBeNull();
    expect(getByTestId(root, 'grpc-request-section-execution-context').text).toContain('lastOrderStatus');
  });

  it('renders assertions from the runtime block', () => {
    const root = useWithRuntime({ assertions: [{ expression: 'res.body.orderId', operator: 'eq', value: '12345' }] });
    expect(queryByTestId(root, 'grpc-request-execution-context-empty')).toBeNull();
    expect(getByTestId(root, 'grpc-request-section-execution-context').text).toContain('res.body.orderId');
  });

  it('renders scripts from the runtime block', () => {
    const root = useWithRuntime({ scripts: [{ type: 'before-request', code: 'bru.setVar(\'requestedAt\', Date.now());' }] });
    expect(queryByTestId(root, 'grpc-request-execution-context-empty')).toBeNull();
  });

  it('labels the script-chain request marker as GRPC', () => {
    const root = useWithRuntime({ scripts: [{ type: 'before-request', code: 'bru.setVar(\'requestedAt\', Date.now());' }] });
    expect(getByTestId(root, 'script-chain-request-label').text).toBe('GRPC');
  });
});
