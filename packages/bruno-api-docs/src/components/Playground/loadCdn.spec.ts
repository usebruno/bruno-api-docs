import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as LoadCdn from './loadCdn';

interface FakeScript {
  src?: string;
  onload?: () => void;
  onerror?: () => void;
}

describe('loadPlayground from the CDN', () => {
  let scripts: FakeScript[];
  let globals: { Bruno: { __rt?: Record<string, unknown> }; __brunoApiPlayground?: unknown };
  let loadPlayground: typeof LoadCdn.loadPlayground;

  beforeEach(async () => {
    vi.resetModules();
    ({ loadPlayground } = await import('./loadCdn'));
    scripts = [];
    globals = { Bruno: {} };
    vi.stubGlobal('window', globals);
    vi.stubGlobal('document', {
      createElement: () => {
        const script: FakeScript = {};
        scripts.push(script);
        return script;
      },
      head: { appendChild: () => {} }
    });
    vi.stubGlobal('__API_PLAYGROUND_FILE__', 'api-playground-abc.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('injects one script for every caller and resolves the component it defines', async () => {
    const first = loadPlayground();
    const second = loadPlayground();
    const Body = () => null;
    globals.__brunoApiPlayground = Body;
    scripts[0].onload!();

    expect(second).toBe(first);
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toMatch(/\/api-playground-abc\.js$/);
    expect(await first).toEqual({ default: Body });
  });

  it('hands the playground the same shared modules the docs use', async () => {
    void loadPlayground();

    expect(globals.Bruno.__rt!.react).toBe(await import('react'));
    expect(globals.Bruno.__rt!.session).toBe(await import('@usebruno/api-shared/session/session'));
  });

  it('rejects when the script fails to load', async () => {
    const loading = loadPlayground();
    scripts[0].onerror!();

    await expect(loading).rejects.toThrow('api-playground-abc.js');
  });
});
