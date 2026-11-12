import { describe, it, expect, vi } from 'vitest';
import { createPlayground, selectedUuid } from './playground';

describe('playground selection', () => {
  it('starts with nothing selected', () => {
    expect(createPlayground().selection.get()).toBeNull();
  });

  it('does not notify when the same selection is set again', () => {
    const { selection } = createPlayground();
    selection.set({ uuid: 'a', exampleIndex: null });
    const listener = vi.fn();
    selection.subscribe(listener);

    selection.set({ uuid: 'a', exampleIndex: null });
    selection.set(selection.get());

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when the example changes on the same request', () => {
    const { selection } = createPlayground();
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

describe('playground selection clearRequest', () => {
  it('drops a selected request but keeps the environments and collection settings views', () => {
    const { selection } = createPlayground();
    selection.set({ uuid: 'r1', exampleIndex: null });
    selection.clearRequest();
    expect(selection.get()).toBeNull();

    selection.set('environments');
    selection.clearRequest();
    expect(selection.get()).toBe('environments');

    selection.set('collection-settings');
    selection.clearRequest();
    expect(selection.get()).toBe('collection-settings');
  });
});

describe('playground response format and preview', () => {
  it('stores a value per request and ignores a missing request', () => {
    const { responseFormat } = createPlayground();
    responseFormat.setEntry('a', 'raw');
    responseFormat.setEntry(null, 'json');
    expect(responseFormat.get()).toEqual({ a: 'raw' });
  });

  it('does not notify when a request gets the value it already has', () => {
    const { responsePreview } = createPlayground();
    responsePreview.setEntry('a', true);
    const listener = vi.fn();
    responsePreview.subscribe(listener);

    responsePreview.setEntry('a', true);

    expect(listener).not.toHaveBeenCalled();
  });
});
