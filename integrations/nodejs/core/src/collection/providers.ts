import fs from 'node:fs';
import crypto from 'node:crypto';
import { ConfigError, type CollectionOptions } from '../options';
import type { HttpResponse, Conditional } from '../http';
import type { SkippedFile } from './walk';
import { walkCollection, CAPS, CapError } from './walk';
import { applyFilters, isManifest } from './filter';

export type Provider = (conditional: Conditional) => HttpResponse;

export interface BuiltProvider {
  serve: Provider;
  fileCount: number;
  skipped: SkippedFile[];
  unknownEnvironments: string[];
}

export class ManifestError extends Error {}

export const etagOf = (data: string | Buffer): string =>
  '"' + crypto.createHash('sha256').update(data).digest('hex').slice(0, 32) + '"';

const DOCUMENT_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff'
};

const NOT_MODIFIED: HttpResponse = { status: 304, headers: {}, body: null };

const errorResponse = (status: number, message: string): HttpResponse => ({
  status,
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  body: message + '\n'
});

/** The document is built once, so serving it is an ETag comparison and nothing else. */
function serveFromMemory(body: string | Buffer, contentType: string): Provider {
  const etag = etagOf(body);
  const headers = { ...DOCUMENT_HEADERS, 'Content-Type': contentType, 'ETag': etag };

  return ({ ifNoneMatch }) => {
    if (ifNoneMatch === etag) return NOT_MODIFIED;
    return { status: 200, headers, body };
  };
}

export function fileProvider(filePath: string): BuiltProvider {
  const size = fs.statSync(filePath).size;
  if (size > CAPS.totalBytes) {
    throw new CapError('total size cap (5MB)', filePath);
  }

  const body = fs.readFileSync(filePath);

  return { serve: serveFromMemory(body, 'text/yaml; charset=utf-8'), fileCount: 1, skipped: [], unknownEnvironments: [] };
}

export function dirProvider(rootDir: string, filters: Omit<CollectionOptions, 'collection'>): BuiltProvider {
  const walked = walkCollection(rootDir);
  if (!walked.files.some((file) => isManifest(file.path))) {
    throw new ManifestError('no opencollection.yml manifest at the collection root');
  }

  const filtered = applyFilters(walked.files, filters);
  const envelope: Record<string, string> = {};
  for (const file of filtered.files) {
    envelope[file.path] = file.text;
  }
  const body = JSON.stringify({ 'opencollection-fragments': '1', 'files': envelope });

  return {
    serve: serveFromMemory(body, 'application/json; charset=utf-8'),
    fileCount: filtered.files.length,
    skipped: [...walked.skipped, ...filtered.skipped],
    unknownEnvironments: filtered.unknownEnvironments
  };
}

/** What the mount serves when the collection could not be built. The app still starts. */
export function errorProvider(err: unknown): Provider {
  if (err instanceof CapError) {
    return () => errorResponse(413, err.message);
  }
  if (err instanceof ManifestError) {
    return () => errorResponse(404, err.message);
  }
  if (err instanceof ConfigError) {
    return () => errorResponse(500, err.message);
  }
  if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
    return () => errorResponse(404, 'Collection not found.');
  }

  return () => errorResponse(500, 'Collection could not be read.');
}
