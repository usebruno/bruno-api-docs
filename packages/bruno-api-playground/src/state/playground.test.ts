import { describe, it, expect, vi } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { playgroundRuns } from '@usebruno/api-shared/session/playgroundRuns';
import { createPlayground, selectedUuid } from './playground';

const EMPTY = {} as OpenCollection;

describe('playground selection', () => {
  it('starts with nothing selected', () => {
    expect(createPlayground(EMPTY).selection.get()).toBeNull();
  });

  it('does not notify when the same selection is set again', () => {
    const { selection } = createPlayground(EMPTY);
    selection.set({ uuid: 'a', exampleIndex: null });
    const listener = vi.fn();
    selection.subscribe(listener);

    selection.set({ uuid: 'a', exampleIndex: null });
    selection.set(selection.get());

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when the example changes on the same request', () => {
    const { selection } = createPlayground(EMPTY);
    selection.set({ uuid: 'a', exampleIndex: null });
    const listener = vi.fn();
    selection.subscribe(listener);

    selection.set({ uuid: 'a', exampleIndex: 0 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(selection.get()).toEqual({ uuid: 'a', exampleIndex: 0 });
  });

  it('selectedUuid is the request uuid, or null for the environments and collection views', () => {
    expect(selectedUuid({ uuid: 'a', exampleIndex: 1 })).toBe('a');
    expect(selectedUuid('environments')).toBeNull();
    expect(selectedUuid(null)).toBeNull();
  });
});

describe('playground response format and preview', () => {
  it('stores a value per request and ignores a missing request', () => {
    const { responseFormat } = createPlayground(EMPTY);
    responseFormat.setEntry('a', 'raw');
    responseFormat.setEntry(null, 'json');
    expect(responseFormat.get()).toEqual({ a: 'raw' });
  });

  it('does not notify when a request gets the value it already has', () => {
    const { responsePreview } = createPlayground(EMPTY);
    responsePreview.setEntry('a', true);
    const listener = vi.fn();
    responsePreview.subscribe(listener);

    responsePreview.setEntry('a', true);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('playground sync', () => {
  const folder = (uuid: string, items: object[] = []) => ({ uuid, info: { name: uuid, type: 'folder' }, items });
  const request = (uuid: string, url: string) => ({ uuid, info: { name: uuid, type: 'http' }, http: { method: 'GET', url } });
  const documentWith = (url: string) => ({ items: [folder('f', [request('r', url)])] }) as unknown as OpenCollection;

  it('seeds the working copy and folders from the document it is created with', () => {
    const document = documentWith('/a');
    const { workspace, folders } = createPlayground(document);
    expect(workspace.get().collection).toBe(document);
    expect(folders.get().items).toBe(document.items);
  });

  it('keeps edits when synced with the document it was seeded from', () => {
    const document = documentWith('/a');
    const { workspace, sync } = createPlayground(document);
    workspace.updateRequestItem({ uuid: 'r', item: request('r', '/edited') as never });
    const edited = workspace.get().collection;

    sync(document);

    expect(workspace.get().collection).toBe(edited);
  });

  it('replaces edits with a new document, keeping responses and folder state by uuid', () => {
    const { workspace, folders, sync } = createPlayground(documentWith('/a'));
    workspace.updateRequestItem({ uuid: 'r', item: request('r', '/edited') as never });
    workspace.setResponse({ uuid: 'r', response: { status: 200 } as never });
    folders.toggle('f');
    const next = documentWith('/b');

    sync(next);

    expect(workspace.get().collection).toBe(next);
    expect(workspace.get().responses).toEqual({ r: { status: 200 } });
    expect(folders.get().collapsed.get('f')).toBe(false);
  });

  it('drops request starts whose run is no longer in flight, and keeps live ones', () => {
    const document = documentWith('/a');
    const { workspace, sync } = createPlayground(document);
    playgroundRuns.beginSend('live');
    workspace.startRequest({ uuid: 'live', startedAt: 1 });
    workspace.startRequest({ uuid: 'aborted', startedAt: 2 });

    sync(document);

    expect(workspace.get().requestStartedAt).toEqual({ live: 1 });
    playgroundRuns.finish('live', null);
  });
});
