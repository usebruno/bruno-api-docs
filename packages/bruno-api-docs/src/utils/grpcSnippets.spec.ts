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
    expect(command).toContain(`-import-path 'protos/telemetry/v1'`);
    expect(command).toContain(`-proto 'telemetry.proto'`);
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

  it('keeps a proto path with spaces as one shell word', () => {
    const command = generateGrpcurlCommand(input({ protoFilePath: 'my protos/book service.proto' }));
    expect(command).toContain(`-import-path 'my protos'`);
    expect(command).toContain(`-proto 'book service.proto'`);
  });

  it('quotes the target and the method so neither can split or execute', () => {
    const command = generateGrpcurlCommand(
      input({ url: 'grpc://host$(whoami):50051', method: '/pkg.Svc/Do$(whoami)' })
    );
    expect(command).toContain(`'host$(whoami):50051'`);
    expect(command).toContain(`'pkg.Svc/Do$(whoami)'`);
  });

  it('drops plaintext when the scheme is TLS but hidden inside a variable', () => {
    const command = generateGrpcurlCommand(input({ url: '{{host}}', resolvedUrl: 'grpcs://grpcb.in:9001' }));
    expect(command).not.toContain('-plaintext');
    expect(command).toContain(`'{{host}}'`);
  });

  it('keeps plaintext when the variable resolves to an unencrypted scheme', () => {
    const command = generateGrpcurlCommand(input({ url: '{{host}}', resolvedUrl: 'grpc://grpcb.in:9000' }));
    expect(command).toContain('-plaintext');
    expect(command).toContain(`'{{host}}'`);
  });

  it('assumes plaintext when the variable resolves to a bare address', () => {
    const command = generateGrpcurlCommand(input({ url: '{{host}}', resolvedUrl: 'grpcb.in:9000' }));
    expect(command).toContain('-plaintext');
  });

  it('assumes plaintext when the variable cannot be resolved', () => {
    expect(generateGrpcurlCommand(input({ url: '{{host}}' }))).toContain('-plaintext');
  });

  it('lets a scheme written into the url win over the resolved value', () => {
    const command = generateGrpcurlCommand(input({ url: 'grpcs://api.example.com:443', resolvedUrl: 'grpc://ignored' }));
    expect(command).not.toContain('-plaintext');
    expect(command).toContain(`'api.example.com:443'`);
  });

  it('neutralises a proto path that carries a shell command', () => {
    const command = generateGrpcurlCommand(input({ protoFilePath: 'protos/book$(rm -rf ~).proto' }));
    expect(command).toContain(`-proto 'book$(rm -rf ~).proto'`);
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

  it('uses TLS credentials when the scheme is hidden inside a variable', () => {
    const code = generateGrpcJavaScriptCode(withProto({ url: '{{host}}', resolvedUrl: 'grpcs://grpcb.in:9001' }));
    expect(code).toContain('grpc.credentials.createSsl()');
    expect(code).toContain(`'{{host}}'`);
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

describe('grpcurl and JavaScript hardening', () => {
  it('picks a heredoc delimiter no message line can close early', () => {
    const command = generateGrpcurlCommand(
      input({
        methodType: 'client-streaming',
        messages: [
          { title: 'a', message: '{"a":1}\nEOF\nrm -rf ~' },
          { title: 'b', message: '{"b":2}' }
        ]
      })
    );
    expect(command).toContain(`<< 'EOF2'`);
    expect(command.trimEnd().endsWith('EOF2')).toBe(true);
    expect(command).toContain('rm -rf ~');
  });

  it('keeps the plain delimiter when no message collides with it', () => {
    const command = generateGrpcurlCommand(
      input({ methodType: 'client-streaming', messages: [{ title: 'a', message: '{"a":1}' }] })
    );
    expect(command).toContain(`<< 'EOF'`);
  });

  it('keeps the root of an absolute proto path', () => {
    const command = generateGrpcurlCommand(input({ protoFilePath: '/protos/book.proto' }));
    expect(command).toContain(`-import-path '/protos'`);
    expect(command).toContain(`-proto 'book.proto'`);
  });

  it('keeps a bare root proto path', () => {
    const command = generateGrpcurlCommand(input({ protoFilePath: '/book.proto' }));
    expect(command).toContain(`-import-path '/'`);
  });

  it('generates no JavaScript when the method is not a plain identifier path', () => {
    const hostile = generateGrpcJavaScriptCode(
      input({ protoFilePath: 'a.proto', method: '/pkg.Svc/Do(); process.exit(1); //' })
    );
    expect(hostile).toBe('');
  });

  it('generates no JavaScript when the service segment is not an identifier path', () => {
    expect(generateGrpcJavaScriptCode(input({ protoFilePath: 'a.proto', method: '/pkg-svc!/Do' }))).toBe('');
  });

  it('still generates JavaScript for an ordinary dotted service path', () => {
    const code = generateGrpcJavaScriptCode(input({ protoFilePath: 'a.proto', method: '/com.book.BookService/GetBook' }));
    expect(code).toContain('new proto.com.book.BookService(');
    expect(code).toContain('client.GetBook(');
  });
});

describe('message bodies in the JavaScript snippet', () => {
  const withProto = (overrides: Partial<GrpcSnippetInput> = {}) =>
    input({ protoFilePath: 'a.proto', method: '/pkg.Svc/Do', ...overrides });

  it('keeps a valid JSON body exactly as the author wrote it', () => {
    const code = generateGrpcJavaScriptCode(withProto({ messages: [{ title: 'a', message: '{\n  "n": 1\n}' }] }));
    expect(code).toContain('const message = {\n  "n": 1\n};');
  });

  it('keeps a templated body so its variables survive', () => {
    const code = generateGrpcJavaScriptCode(withProto({ messages: [{ title: 'a', message: '{"id":"{{orderId}}"}' }] }));
    expect(code).toContain('const message = {"id":"{{orderId}}"};');
  });

  it('quotes a body that is not JSON so it cannot become executable code', () => {
    const code = generateGrpcJavaScriptCode(withProto({ messages: [{ title: 'a', message: '};process.exit(1);//' }] }));
    expect(code).toContain(`const message = '};process.exit(1);//';`);
    expect(code).not.toContain('const message = };');
  });

  it('falls back to an empty object for a blank body', () => {
    const code = generateGrpcJavaScriptCode(withProto({ messages: [{ title: 'a', message: '   ' }] }));
    expect(code).toContain('const message = {};');
  });
});

describe('auth in the generated snippets', () => {
  const bearer = { type: 'bearer', token: 'abc123' } as never;

  it('sends bearer auth as grpcurl metadata', () => {
    const command = generateGrpcurlCommand(input({ auth: bearer }));
    expect(command).toContain(`-H 'Authorization: Bearer abc123'`);
  });

  it('sends bearer auth as JavaScript metadata', () => {
    const code = generateGrpcJavaScriptCode(input({ protoFilePath: 'a.proto', auth: bearer }));
    expect(code).toContain(`metadata.set('Authorization', 'Bearer abc123');`);
    expect(code).toContain('const metadata = new grpc.Metadata();');
  });

  it('does not overwrite metadata the request already declares', () => {
    const command = generateGrpcurlCommand(
      input({ auth: bearer, metadata: [{ name: 'authorization', value: 'Bearer mine' }] as GrpcMetadata[] })
    );
    expect(command).toContain(`-H 'authorization: Bearer mine'`);
    expect(command).not.toContain('abc123');
  });

  it('notes auth it cannot express as metadata instead of dropping it silently', () => {
    const command = generateGrpcurlCommand(input({ auth: { type: 'awsv4' } as never }));
    expect(command).toContain('# auth: awsv4');
  });

  it('leaves the snippets untouched when there is no auth', () => {
    expect(generateGrpcurlCommand(input())).not.toContain('Authorization');
  });

  it('contains a templated body that appends statements', () => {
    const code = generateGrpcJavaScriptCode(
      input({
        protoFilePath: 'a.proto',
        messages: [{ title: 'a', message: `{"a":"{{t}}"}; require('child_process').execSync('x')` }]
      })
    );
    expect(code).toContain(`const message = '{"a":"{{t}}"}`);
    expect(code).not.toContain('const message = {"a":"{{t}}"}; require');
  });

  it('still keeps an ordinary templated body verbatim', () => {
    const code = generateGrpcJavaScriptCode(
      input({ protoFilePath: 'a.proto', messages: [{ title: 'a', message: '{"n":{{count}}}' }] })
    );
    expect(code).toContain('const message = {"n":{{count}}};');
  });
});
