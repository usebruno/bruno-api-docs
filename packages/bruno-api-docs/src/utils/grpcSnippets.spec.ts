import { describe, it, expect } from 'vitest';
import type { GrpcMetadata } from '@opencollection/types/requests/grpc';
import { generateGrpcJavaScriptCode, generateGrpcurlCommand, type GrpcSnippetInput } from './grpcSnippets';

const input = (overrides: Partial<GrpcSnippetInput> = {}): GrpcSnippetInput => ({
  url: 'grpc://localhost:50051',
  method: '/hello.HelloService/SayHello',
  metadata: [] as GrpcMetadata[],
  messages: [{ title: 'Message 1', message: '{"greeting":"hi"}' }],
  ...overrides
});

describe('generateGrpcurlCommand', () => {
  it('builds a unary command with the message inline', () => {
    const command = generateGrpcurlCommand(input({ methodType: 'unary' }));
    expect(command).toContain('grpcurl');
    expect(command).toContain('-plaintext');
    expect(command).toContain(`-d '{"greeting":"hi"}'`);
    expect(command).toContain('localhost:50051');
    expect(command).toContain('hello.HelloService/SayHello');
  });

  it('strips the scheme and the leading slash of the method', () => {
    const command = generateGrpcurlCommand(input());
    expect(command).not.toContain('grpc://');
    expect(command).not.toContain('/hello.HelloService');
  });

  it('omits plaintext for a TLS target', () => {
    const command = generateGrpcurlCommand(input({ url: 'grpcs://api.example.com:443' }));
    expect(command).not.toContain('-plaintext');
    expect(command).toContain('api.example.com:443');
  });

  it('passes enabled metadata as headers and skips disabled ones', () => {
    const command = generateGrpcurlCommand(
      input({
        metadata: [
          { name: 'authorization', value: 'Bearer t' },
          { name: 'x-legacy', value: 'off', disabled: true }
        ] as GrpcMetadata[]
      })
    );
    expect(command).toContain(`-H 'authorization: Bearer t'`);
    expect(command).not.toContain('x-legacy');
  });

  it('adds the import path and proto file when one is attached', () => {
    const command = generateGrpcurlCommand(input({ protoFilePath: 'protos/telemetry/v1/telemetry.proto' }));
    expect(command).toContain('-import-path protos/telemetry/v1');
    expect(command).toContain('-proto telemetry.proto');
  });

  it('omits proto flags when the request uses reflection', () => {
    const command = generateGrpcurlCommand(input());
    expect(command).not.toContain('-proto');
    expect(command).not.toContain('-import-path');
  });

  it('pipes every message through stdin for client streaming', () => {
    const command = generateGrpcurlCommand(
      input({
        methodType: 'client-streaming',
        messages: [
          { title: 'Message 1', message: '{"n":1}' },
          { title: 'Message 2', message: '{"n":2}' }
        ]
      })
    );
    expect(command).toContain('-d @');
    expect(command).toContain(`<< 'EOF'`);
    expect(command).toContain('{"n":1}');
    expect(command).toContain('{"n":2}');
    expect(command.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('pipes messages through stdin for bidi streaming too', () => {
    const command = generateGrpcurlCommand(
      input({ methodType: 'bidi-streaming', messages: [{ title: 'Message 1', message: '{"n":1}' }] })
    );
    expect(command).toContain('-d @');
    expect(command).toContain(`<< 'EOF'`);
  });

  it('leaves out the data flag when the request has no messages', () => {
    const command = generateGrpcurlCommand(input({ messages: [] }));
    expect(command).not.toContain('-d');
    expect(command).toContain('hello.HelloService/SayHello');
  });

  it('keeps a quote in a metadata value inside the quoted header', () => {
    const command = generateGrpcurlCommand(
      input({ metadata: [{ name: 'x-note', value: 'it\'s here' }] as GrpcMetadata[] })
    );
    expect(command).toContain(`-H 'x-note: it'\\''s here'`);
  });

  it('keeps a quote in a message inside the quoted data flag', () => {
    const command = generateGrpcurlCommand(input({ messages: [{ title: 'Message 1', message: `{"note":"it's"}` }] }));
    expect(command).toContain(`-d '{"note":"it'\\''s"}'`);
  });
});

describe('generateGrpcJavaScriptCode', () => {
  const withProto = (overrides: Partial<GrpcSnippetInput> = {}) =>
    input({ protoFilePath: 'protos/hello.proto', ...overrides });

  it('loads the proto file and builds a client for the service', () => {
    const code = generateGrpcJavaScriptCode(withProto({ methodType: 'unary' }));
    expect(code).toContain(`protoLoader.loadSync('protos/hello.proto')`);
    expect(code).toContain(`new proto.hello.HelloService('localhost:50051', grpc.credentials.createInsecure())`);
    expect(code).toContain('client.SayHello(');
  });

  it('uses TLS credentials for a grpcs target', () => {
    const code = generateGrpcJavaScriptCode(withProto({ url: 'grpcs://api.example.com:443' }));
    expect(code).toContain('grpc.credentials.createSsl()');
  });

  it('adds enabled metadata and skips disabled rows', () => {
    const code = generateGrpcJavaScriptCode(
      withProto({
        metadata: [
          { name: 'authorization', value: 'Bearer t' },
          { name: 'x-legacy', value: 'off', disabled: true }
        ] as GrpcMetadata[]
      })
    );
    expect(code).toContain(`metadata.set('authorization', 'Bearer t')`);
    expect(code).not.toContain('x-legacy');
  });

  it('listens for data on a server-streaming call', () => {
    const code = generateGrpcJavaScriptCode(withProto({ methodType: 'server-streaming' }));
    expect(code).toContain('const call = client.SayHello(');
    expect(code).toContain(`call.on('data'`);
    expect(code).not.toContain('call.write');
  });

  it('writes every message for a client-streaming call', () => {
    const code = generateGrpcJavaScriptCode(
      withProto({
        methodType: 'client-streaming',
        messages: [
          { title: 'Message 1', message: '{"n":1}' },
          { title: 'Message 2', message: '{"n":2}' }
        ]
      })
    );
    expect(code).toContain('const messages = [');
    expect(code).toContain('{"n":1}');
    expect(code).toContain('{"n":2}');
    expect(code).toContain('call.write(message)');
    expect(code).toContain('call.end()');
  });

  it('both reads and writes on a bidi call', () => {
    const code = generateGrpcJavaScriptCode(withProto({ methodType: 'bidi-streaming' }));
    expect(code).toContain(`call.on('data'`);
    expect(code).toContain('call.write(message)');
  });

  it('declares an empty message when the request carries none', () => {
    const code = generateGrpcJavaScriptCode(withProto({ methodType: 'unary', messages: [] }));
    expect(code).toContain('const message = {};');
    expect(code).toContain('client.SayHello(message, ');
  });

  it('declares an empty message for a server-streaming request that carries none', () => {
    const code = generateGrpcJavaScriptCode(withProto({ methodType: 'server-streaming', messages: [] }));
    expect(code).toContain('const message = {};');
    expect(code).toContain('const call = client.SayHello(message);');
  });

  it('generates nothing when the method names no service', () => {
    expect(generateGrpcJavaScriptCode(withProto({ method: 'SayHello' }))).toBe('');
  });

  it('generates nothing when the request has no proto file', () => {
    expect(generateGrpcJavaScriptCode(input())).toBe('');
  });

  it('escapes a quote in a metadata value', () => {
    const code = generateGrpcJavaScriptCode(
      withProto({ metadata: [{ name: 'x-note', value: 'it\'s here' }] as GrpcMetadata[] })
    );
    expect(code).toContain(`metadata.set('x-note', 'it\\'s here');`);
  });
});
