import type { GrpcMetadata, GrpcMethodType } from '@opencollection/types/requests/grpc';
import type { GrpcMessageEntry } from './schemaHelpers';

export interface GrpcSnippetInput {
  url: string;
  method: string;
  methodType?: GrpcMethodType;
  protoFilePath?: string;
  metadata: GrpcMetadata[];
  messages: GrpcMessageEntry[];
}

const parseTarget = (url: string): { target: string; plaintext: boolean } => {
  const trimmed = url.trim();
  const match = trimmed.match(/^(grpcs?|https?):\/\/(.*)$/i);
  if (!match) {
    return { target: trimmed, plaintext: true };
  }
  const scheme = match[1].toLowerCase();
  return { target: match[2], plaintext: scheme === 'grpc' || scheme === 'http' };
};

const parseMethod = (method: string): string => method.replace(/^\//, '');

const parseProtoFlags = (protoFilePath: string): string[] => {
  const segments = protoFilePath.split(/[\\/]/).filter(Boolean);
  const file = segments[segments.length - 1];
  const dir = segments.slice(0, -1).join('/');
  return dir ? [`-import-path ${dir}`, `-proto ${file}`] : [`-proto ${file}`];
};

const isClientStreaming = (methodType?: GrpcMethodType): boolean =>
  methodType === 'client-streaming' || methodType === 'bidi-streaming';

const parseService = (method: string): { servicePath: string; methodName: string } => {
  const trimmed = method.replace(/^\//, '');
  const slash = trimmed.lastIndexOf('/');
  if (slash === -1) return { servicePath: '', methodName: trimmed };
  return { servicePath: trimmed.slice(0, slash), methodName: trimmed.slice(slash + 1) };
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const jsQuote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;

const indent = (text: string, spaces: number): string =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${' '.repeat(spaces)}${line}`))
    .join('\n');

export const generateGrpcurlCommand = ({
  url,
  method,
  methodType,
  protoFilePath,
  metadata,
  messages
}: GrpcSnippetInput): string => {
  const { target, plaintext } = parseTarget(url);
  const parts: string[] = ['grpcurl'];

  if (plaintext) {
    parts.push('-plaintext');
  }

  for (const entry of metadata.filter((item) => !item.disabled)) {
    parts.push(`-H ${shellQuote(`${entry.name}: ${entry.value}`)}`);
  }

  if (protoFilePath) {
    parts.push(...parseProtoFlags(protoFilePath));
  }

  const streaming = isClientStreaming(methodType);

  if (messages.length > 0) {
    parts.push(streaming ? '-d @' : `-d ${shellQuote(messages[0].message)}`);
  }

  parts.push(target);
  parts.push(parseMethod(method));

  const command = parts.join(' \\\n  ');

  if (streaming && messages.length > 0) {
    return `${command} << 'EOF'\n${messages.map((entry) => entry.message).join('\n')}\nEOF`;
  }

  return command;
};

export const generateGrpcJavaScriptCode = ({
  url,
  method,
  methodType,
  protoFilePath,
  metadata,
  messages
}: GrpcSnippetInput): string => {
  const { servicePath, methodName } = parseService(method);
  if (!protoFilePath || !servicePath) return '';

  const { target, plaintext } = parseTarget(url);
  const enabled = metadata.filter((entry) => !entry.disabled);
  const credentials = plaintext ? 'grpc.credentials.createInsecure()' : 'grpc.credentials.createSsl()';

  const lines: string[] = [
    `const grpc = require('@grpc/grpc-js');`,
    `const protoLoader = require('@grpc/proto-loader');`,
    '',
    `const packageDefinition = protoLoader.loadSync(${jsQuote(protoFilePath)});`,
    'const proto = grpc.loadPackageDefinition(packageDefinition);',
    '',
    `const client = new proto.${servicePath}(${jsQuote(target)}, ${credentials});`
  ];

  if (enabled.length > 0) {
    lines.push('', 'const metadata = new grpc.Metadata();');
    enabled.forEach((entry) => lines.push(`metadata.set(${jsQuote(entry.name)}, ${jsQuote(entry.value)});`));
  }

  const metadataArg = enabled.length > 0 ? 'metadata' : '';
  const streamsIn = methodType === 'client-streaming' || methodType === 'bidi-streaming';
  const streamsOut = methodType === 'server-streaming' || methodType === 'bidi-streaming';

  if (streamsIn) {
    lines.push('', 'const messages = [');
    messages.forEach((entry, index) => {
      const comma = index === messages.length - 1 ? '' : ',';
      lines.push(`  ${indent(entry.message, 2)}${comma}`);
    });
    lines.push('];');
  } else {
    lines.push('', `const message = ${messages.length > 0 ? messages[0].message : '{}'};`);
  }

  lines.push('');

  const callArgs = [streamsIn ? '' : 'message', metadataArg].filter(Boolean).join(', ');

  if (!streamsIn && !streamsOut) {
    lines.push(
      `client.${methodName}(${callArgs}${callArgs ? ', ' : ''}(error, response) => {`,
      '  console.log(error ?? response);',
      '});'
    );
  } else {
    const opener = streamsIn && !streamsOut ? `${callArgs}${callArgs ? ', ' : ''}(error, response) => {` : callArgs;
    if (streamsIn && !streamsOut) {
      lines.push(`const call = client.${methodName}(${opener}`, '  console.log(error ?? response);', '});');
    } else {
      lines.push(`const call = client.${methodName}(${opener});`);
    }

    if (streamsOut) {
      lines.push(`call.on('data', (response) => console.log(response));`, `call.on('end', () => console.log('done'));`);
    }

    if (streamsIn) {
      lines.push('', 'for (const message of messages) {', '  call.write(message);', '}', 'call.end();');
    }
  }

  return lines.join('\n');
};
