import fs from 'node:fs';
import path from 'node:path';

export interface WalkedFile {
  path: string;
  text: string;
}

export interface SkippedFile {
  path: string;
  rule: string;
}

export interface WalkResult {
  files: WalkedFile[];
  skipped: SkippedFile[];
}

export interface Caps {
  fileBytes: number;
  totalBytes: number;
  fileCount: number;
  depth: number;
}

export const CAPS: Caps = Object.freeze({
  fileBytes: 1024 * 1024,
  totalBytes: 5 * 1024 * 1024,
  fileCount: 5000,
  depth: 32
});

const STRAY_SUFFIXES = ['~', '.swp', '.swo', '.bak', '.orig', '.rej', '.tmp'];

export class CapError extends Error {
  constructor(cap: string, relPath: string) {
    super(`collection exceeds ${cap} at: ${relPath}`);
  }
}

const isStray = (name: string): boolean =>
  name.startsWith('.')
  || name === 'node_modules'
  || STRAY_SUFFIXES.some((suffix) => name.endsWith(suffix))
  || (name.startsWith('#') && name.endsWith('#'));

const isYaml = (name: string): boolean => name.endsWith('.yml') || name.endsWith('.yaml');

const utf8Strict = new TextDecoder('utf-8', { fatal: true });

/** `caps` is a parameter so the limits can be tested without a 5 MB, 5000-file, 32-deep fixture. */
export function walkCollection(rootDir: string, caps: Caps = CAPS): WalkResult {
  const rootReal = fs.realpathSync(rootDir);
  const files: WalkedFile[] = [];
  const skipped: SkippedFile[] = [];
  let totalBytes = 0;

  const isInsideRoot = (absPath: string): boolean => {
    const real = fs.realpathSync(absPath);
    return real === rootReal || real.startsWith(rootReal + path.sep);
  };

  const visit = (dir: string, rel: string, depth: number): void => {
    if (depth > caps.depth) {
      throw new CapError('max directory depth', rel);
    }

    // sorted so every language core serves the same bytes and the same ETag
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const name = entry.name;
      const relPath = rel ? `${rel}/${name}` : name;
      const absPath = path.join(dir, name);

      if (isStray(name)) {
        skipped.push({ path: relPath, rule: 'stray/dot/ignored name' });
        continue;
      }
      if (entry.isSymbolicLink()) {
        skipped.push({ path: relPath, rule: 'symlink (never followed)' });
        continue;
      }
      if (entry.isDirectory()) {
        visit(absPath, relPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) {
        skipped.push({ path: relPath, rule: 'not a regular file' });
        continue;
      }
      if (!isYaml(name)) {
        skipped.push({ path: relPath, rule: 'not .yml' });
        continue;
      }
      if (!isInsideRoot(absPath)) {
        skipped.push({ path: relPath, rule: 'resolves outside collection root' });
        continue;
      }

      const size = fs.statSync(absPath).size;
      if (size > caps.fileBytes) {
        throw new CapError('per-file size cap (1MB)', relPath);
      }
      totalBytes += size;
      if (totalBytes > caps.totalBytes) {
        throw new CapError('total size cap (5MB)', relPath);
      }
      if (files.length >= caps.fileCount) {
        throw new CapError('file count cap', relPath);
      }

      let text: string;
      try {
        text = utf8Strict.decode(fs.readFileSync(absPath));
      } catch {
        skipped.push({ path: relPath, rule: 'not valid UTF-8' });
        continue;
      }

      files.push({ path: relPath, text });
    }
  };

  visit(rootReal, '', 0);
  return { files, skipped };
}
