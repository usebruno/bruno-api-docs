import fs from 'node:fs';
import path from 'node:path';
import { ConfigError } from '../options';
import { isManifest } from './filter';
import { safeLoad } from './yaml';

export interface CollectionSource {
  mode: 'dir' | 'file';
  path: string;
}

/**
 * npm start, Docker and systemd all start the same entry file from different working
 * directories, so the cwd is not a stable base. `require.main` is undefined under ESM,
 * where `process.argv[1]` is the entry instead.
 */
export function resolveCollectionPath(collectionOption: string): string {
  // guarded here rather than in validateOptions: an empty path resolves to the app's own
  // directory, and walking that would serve whatever yml the adopter happens to keep there
  if (!collectionOption) {
    throw new ConfigError('apiDocs: `collection` is required');
  }

  const entryDir = require.main?.path
    ?? (process.argv[1] ? path.dirname(process.argv[1]) : undefined)
    ?? process.cwd();

  return path.resolve(entryDir, collectionOption);
}

export function resolveCollectionSource(collectionOption: string): CollectionSource {
  const resolved = resolveCollectionPath(collectionOption);

  try {
    if (fs.statSync(resolved).isDirectory()) {
      return { mode: 'dir', path: resolved };
    }

    // pointing at the manifest of an unbundled collection means the directory around it
    if (isManifest(path.basename(resolved))) {
      const manifest = safeLoad(fs.readFileSync(resolved, 'utf8'));
      if (manifest?.bundled === false) {
        return { mode: 'dir', path: path.dirname(resolved) };
      }
    }
  } catch {
    // failing to inspect it is the answer, not an error: treat it as a file and let the
    // provider report it, with a status, at the mount. collection.test.mjs pins that.
  }

  return { mode: 'file', path: resolved };
}
