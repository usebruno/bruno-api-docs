import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveCollectionSource } from './useCollectionLoader';

const YAML = 'info:\n  name: Users API\n';
const collection = { info: { name: 'Users API' } };

describe('resolveCollectionSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes an object through with no source text', async () => {
    expect(await resolveCollectionSource(collection)).toEqual({ collection, sourceText: null });
  });

  it('parses a YAML string and keeps it as the source text', async () => {
    expect(await resolveCollectionSource(YAML)).toEqual({ collection, sourceText: YAML });
  });

  it('parses a JSON string', async () => {
    const json = JSON.stringify(collection);
    expect(await resolveCollectionSource(json)).toEqual({ collection, sourceText: json });
  });

  it('reads and parses a File', async () => {
    expect(await resolveCollectionSource(new File([YAML], 'users.yml'))).toEqual({ collection, sourceText: YAML });
  });

  it('fetches an http(s) URL and parses the body', async () => {
    const fetch = vi.fn(async () => new Response(YAML));
    vi.stubGlobal('fetch', fetch);

    expect(await resolveCollectionSource('https://example.com/users.yml')).toEqual({ collection, sourceText: YAML });
    expect(fetch).toHaveBeenCalledWith('https://example.com/users.yml');
  });

  it('rejects with the status text when the URL does not answer ok', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 404, statusText: 'Not Found' }));

    await expect(resolveCollectionSource('https://example.com/users.yml')).rejects.toThrow('Failed to fetch collection: Not Found');
  });

  it('rejects text that is neither YAML nor JSON', async () => {
    await expect(resolveCollectionSource('key: [unclosed')).rejects.toThrow('Failed to parse collection as YAML or JSON');
  });
});
