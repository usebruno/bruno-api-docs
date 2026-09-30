import { execFileSync } from 'node:child_process';
import { ConfigError } from '../options';
import { log } from '../log';
import { stripGitCredentials } from '../url';
import { CAPS, CapError } from './walk';
import { safeLoad } from './yaml';

export class RemoteError extends Error {}

const FETCH_TIMEOUT_MS = 30_000;

export function parseCollectionUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ConfigError(`apiDocs: \`url\` is not a URL: ${value}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new ConfigError('apiDocs: `url` must be https');
  }
  if (parsed.username || parsed.password) {
    log.warn('credentials in `url` were ignored, the file has to be public');
  }
  if (!/\.(ya?ml|json)$/i.test(parsed.pathname)) {
    throw new ConfigError('apiDocs: `url` takes the address of a bundled collection file, .yml, .yaml or .json');
  }

  return stripGitCredentials(value);
}

// the boot is synchronous and fetch is not, so the one request runs in a child of this same node
const FETCH = `
try {
  const res = await fetch(process.argv[1], { redirect: 'follow', signal: AbortSignal.timeout(${FETCH_TIMEOUT_MS}) });
  if (!res.ok) {
    throw new Error('HTTP ' + res.status);
  }
  process.stdout.write(await res.text());
} catch (err) {
  console.error(err.name === 'TimeoutError' ? 'no answer in ${FETCH_TIMEOUT_MS / 1000}s' : (err.cause?.code ?? err.cause?.errors?.[0]?.code ?? err.cause?.message ?? err.message));
  process.exit(2);
}
`;

/** The document at a public address, fetched once at boot, under the same size cap as a file on disk. */
export function fetchBundled(url: string): string {
  let text: string;
  try {
    text = execFileSync(process.execPath, ['--input-type=module', '-e', FETCH, url], {
      timeout: FETCH_TIMEOUT_MS + 5_000,
      maxBuffer: CAPS.totalBytes,
      stdio: ['ignore', 'pipe', 'pipe']
    }).toString();
  } catch (err) {
    const failed = err as NodeJS.ErrnoException & { stderr?: Buffer };
    if (failed.code === 'ENOBUFS') {
      throw new CapError('total size cap (5MB)', url);
    }
    const reason = failed.stderr?.toString().trim().split('\n').pop() || failed.message;

    throw new RemoteError(`could not fetch ${url}: ${reason}`);
  }

  if (safeLoad(text)?.bundled === false) {
    throw new ConfigError('apiDocs: the file at `url` is the manifest of a directory collection, `url` takes a bundled collection');
  }

  return text;
}
