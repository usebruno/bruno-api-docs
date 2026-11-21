import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: vi.fn(), unmount: vi.fn() })
}));
vi.mock('./components/OpenCollection/OpenCollection', () => ({ default: () => null }));
vi.mock('./components/Playground/load', () => ({ loadPlayground: vi.fn() }));
vi.mock('@usebruno/api-shared/utils/prism', () => ({ default: {} }));

const collection = { opencollection: '1.0.0', info: { name: 'x' } };

describe('standalone globals', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let globals: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('__BRUNO_BUILD__', {});
    vi.stubGlobal('document', { querySelector: () => ({}) });
    vi.stubGlobal('Bruno', { theirs: 1 });
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await import('./standalone');
    globals = globalThis as any;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  it('warns once per page for window.OpenCollection', () => {
    const target = {} as HTMLElement;
    new globals.OpenCollection({ target, opencollection: collection });
    new globals.OpenCollection({ target, opencollection: collection });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Bruno.apiDocs');
  });

  it('does not warn for Bruno.apiDocs', () => {
    globals.Bruno.apiDocs({} as HTMLElement, { content: collection });
    globals.Bruno.apiDocs({} as HTMLElement, { content: collection });
    expect(warn).not.toHaveBeenCalled();
  });

  it('adds Bruno.apiPlayground next to Bruno.apiDocs and keeps what the page already put on Bruno', () => {
    expect(Object.keys(globals.Bruno).sort()).toEqual(['apiDocs', 'apiPlayground', 'build', 'theirs']);
  });

  it('returns updateCollection and destroy from Bruno.apiPlayground', () => {
    const instance = globals.Bruno.apiPlayground({} as HTMLElement, { content: collection });
    expect(Object.keys(instance).sort()).toEqual(['destroy', 'updateCollection']);
  });
});
