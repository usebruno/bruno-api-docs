import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as LoadCdn from './loadCdn';
import { cdnExternals } from '@usebruno/api-shared/utils/cdnExternals';
// Loaded before document is stubbed: prism touches the DOM on load when a document exists.
import 'prismjs';

interface FakeScript {
  src?: string;
  nonce?: string;
  onload?: () => void;
  onerror?: () => void;
  remove: () => void;
}

describe('loadPlayground from the CDN', () => {
  let scripts: FakeScript[];
  let globals: { Bruno: { __rt?: Record<string, unknown> }; __brunoApiPlayground?: unknown };
  let loadPlayground: typeof LoadCdn.loadPlayground;

  beforeEach(async () => {
    vi.resetModules();
    scripts = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const script: FakeScript = { remove: vi.fn() };
        scripts.push(script);
        return script;
      },
      head: { appendChild: () => {} },
      currentScript: { nonce: 'n1' }
    });
    vi.stubGlobal('__API_PLAYGROUND_FILE__', 'api-playground-abc.js');
    ({ loadPlayground } = await import('./loadCdn'));
    globals = { Bruno: {} };
    vi.stubGlobal('window', globals);
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
    expect(scripts[0].nonce).toBe('n1');
    expect(await first).toEqual({ default: Body });
  });

  it('hands the playground every CDN external as the module the docs use', async () => {
    void loadPlayground();

    expect(Object.keys(globals.Bruno.__rt!).sort()).toEqual(Object.keys(cdnExternals).sort());
    for (const [name, specifier] of Object.entries(cdnExternals)) {
      expect(globals.Bruno.__rt![name], name).toBe(await import(/* @vite-ignore */ specifier));
    }
  });

  it('rejects when the script fails to load', async () => {
    const loading = loadPlayground();
    scripts[0].onerror!();

    await expect(loading).rejects.toThrow('api-playground-abc.js');
  });

  it('rejects and retries when the script loads without defining the playground', async () => {
    const failed = loadPlayground();
    scripts[0].onload!();
    await expect(failed).rejects.toThrow('api-playground-abc.js');

    const retried = loadPlayground();
    const Body = () => null;
    globals.__brunoApiPlayground = Body;
    scripts[1].onload!();

    expect(scripts[0].remove).toHaveBeenCalledOnce();
    expect(await retried).toEqual({ default: Body });
  });

  it('injects a fresh script on the next call after a failed load', async () => {
    const failed = loadPlayground();
    scripts[0].onerror!();
    await expect(failed).rejects.toThrow('api-playground-abc.js');

    const retried = loadPlayground();
    const Body = () => null;
    globals.__brunoApiPlayground = Body;
    scripts[1].onload!();

    expect(scripts).toHaveLength(2);
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    expect(scripts[1].remove).not.toHaveBeenCalled();
    expect(await retried).toEqual({ default: Body });
  });
});
