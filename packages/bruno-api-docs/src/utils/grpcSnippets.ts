import type { GrpcMetadata, GrpcMethodType } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import type { GrpcMessageEntry } from '@/utils/schemaHelpers';
import { templateVariableGlobalRegex } from '@/utils/common';
import { authToHeaders } from '@/utils/codeSnippets';

export interface GrpcSnippetInput {
  url: string;
  method: string;
  methodType?: GrpcMethodType;
  protoFilePath?: string;
  metadata: GrpcMetadata[];
  messages: GrpcMessageEntry[];
  resolvedUrl?: string;
  auth?: Auth;
}

const SCHEME_PATTERN = /^(grpcs?|https?):\/\//i;

const schemeOf = (value: string): string | undefined => value.trim().match(SCHEME_PATTERN)?.[1]?.toLowerCase();

const parseTarget = (url: string, resolvedUrl?: string): { target: string; plaintext: boolean } => {
  const trimmed = url.trim();
  const scheme = schemeOf(trimmed) ?? schemeOf(resolvedUrl ?? '');
  const plaintext = !scheme || scheme === 'grpc' || scheme === 'http';
  return { target: trimmed.replace(SCHEME_PATTERN, ''), plaintext };
};

export const grpcMethodPath = (method: string): string => method.replace(/^\//, '');

const buildProtoFlags = (protoFilePath: string): string[] => {
  const normalised = protoFilePath.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  const lastSlash = normalised.lastIndexOf('/');
  const file = lastSlash === -1 ? normalised : normalised.slice(lastSlash + 1);
  const dir = lastSlash === -1 ? '' : normalised.slice(0, lastSlash) || '/';
  return dir ? [`-import-path ${shellQuote(dir)}`, `-proto ${shellQuote(file)}`] : [`-proto ${shellQuote(file)}`];
};

const streamsInFor = (methodType?: GrpcMethodType): boolean =>
  methodType === 'client-streaming' || methodType === 'bidi-streaming';

const streamsOutFor = (methodType?: GrpcMethodType): boolean =>
  methodType === 'server-streaming' || methodType === 'bidi-streaming';

const parseService = (method: string): { servicePath: string; methodName: string } => {
  const trimmed = grpcMethodPath(method);
  const slash = trimmed.lastIndexOf('/');
  if (slash === -1) return { servicePath: '', methodName: trimmed };
  return { servicePath: trimmed.slice(0, slash), methodName: trimmed.slice(slash + 1) };
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const IDENTIFIER_PATH = /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

const effectiveMetadata = (
  metadata: GrpcMetadata[],
  auth: Auth | undefined
): { entries: GrpcMetadata[]; note?: string } => {
  const entries = metadata.filter((entry) => !entry.disabled);
  const { headers, comment } = authToHeaders(auth);
  headers.forEach((header) => {
    const present = entries.some((entry) => (entry.name || '').toLowerCase() === header.name.toLowerCase());
    if (!present) entries.push({ name: header.name, value: header.value });
  });
  return { entries, note: comment };
};

const heredocDelimiter = (messages: string[]): string => {
  const lines = new Set(messages.flatMap((message) => message.split('\n').map((line) => line.trim())));
  let delimiter = 'EOF';
  for (let suffix = 2; lines.has(delimiter); suffix += 1) delimiter = `EOF${suffix}`;
  return delimiter;
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const jsQuote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;

const jsObjectLiteral = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed) return '{}';
  try {
    JSON.parse(trimmed.replace(templateVariableGlobalRegex(), '0'));
    return trimmed;
  } catch {
    return jsQuote(trimmed);
  }
};

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
  messages,
  resolvedUrl,
  auth
}: GrpcSnippetInput): string => {
  const { target, plaintext } = parseTarget(url, resolvedUrl);
  const { entries, note } = effectiveMetadata(metadata, auth);
  const parts: string[] = ['grpcurl'];

  if (plaintext) {
    parts.push('-plaintext');
  }

  for (const entry of entries) {
    parts.push(`-H ${shellQuote(`${entry.name}: ${entry.value}`)}`);
  }

  if (protoFilePath) {
    parts.push(...buildProtoFlags(protoFilePath));
  }

  const streaming = streamsInFor(methodType);

  if (messages.length > 0) {
    parts.push(streaming ? '-d @' : `-d ${shellQuote(messages[0].message)}`);
  }

  parts.push(shellQuote(target));
  parts.push(shellQuote(grpcMethodPath(method)));

  const command = parts.join(' \\\n  ');
  const prefix = note ? `# ${note}\n` : '';

  if (streaming && messages.length > 0) {
    const bodies = messages.map((entry) => entry.message);
    const delimiter = heredocDelimiter(bodies);
    return `${prefix}${command} << '${delimiter}'\n${bodies.join('\n')}\n${delimiter}`;
  }

  return `${prefix}${command}`;
};

export const generateGrpcJavaScriptCode = ({
  url,
  method,
  methodType,
  protoFilePath,
  metadata,
  messages,
  resolvedUrl,
  auth
}: GrpcSnippetInput): string => {
  const { servicePath, methodName } = parseService(method);
  if (!protoFilePath || !IDENTIFIER_PATH.test(servicePath) || !IDENTIFIER.test(methodName)) return '';

  const { target, plaintext } = parseTarget(url, resolvedUrl);
  const { entries: enabled, note } = effectiveMetadata(metadata, auth);
  const credentials = plaintext ? 'grpc.credentials.createInsecure()' : 'grpc.credentials.createSsl()';

  const lines: string[] = [
    ...(note ? [`// ${note}`] : []),
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
  const streamsIn = streamsInFor(methodType);
  const streamsOut = streamsOutFor(methodType);

  if (streamsIn) {
    lines.push('', 'const messages = [');
    messages.forEach((entry, index) => {
      const comma = index === messages.length - 1 ? '' : ',';
      lines.push(`  ${indent(jsObjectLiteral(entry.message), 2)}${comma}`);
    });
    lines.push('];');
  } else {
    lines.push('', `const message = ${messages.length > 0 ? jsObjectLiteral(messages[0].message) : '{}'};`);
  }

  lines.push('');

  const callArgs = [streamsIn ? '' : 'message', metadataArg].filter(Boolean).join(', ');

  const withCallback = `${callArgs}${callArgs ? ', ' : ''}(error, response) => {`;

  if (!streamsOut) {
    const opening = streamsIn ? `const call = client.${methodName}(` : `client.${methodName}(`;
    lines.push(`${opening}${withCallback}`, '  console.log(error ?? response);', '});');
  } else {
    lines.push(`const call = client.${methodName}(${callArgs});`);
    lines.push(`call.on('data', (response) => console.log(response));`, `call.on('end', () => console.log('done'));`);
  }

  if (streamsIn) {
    lines.push('', 'for (const message of messages) {', '  call.write(message);', '}', 'call.end();');
  }

  return lines.join('\n');
};
