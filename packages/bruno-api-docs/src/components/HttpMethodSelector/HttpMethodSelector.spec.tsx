import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MenuDropdownItem } from '../../ui/MenuDropdown';

// The real MenuDropdown (Tippy) only renders its rows while open, so the options
// never reach the DOM in an SSR render, so intercepting the props is the only way
// to observe which methods are offered and which one is marked selected.
const capturedProps: { items: MenuDropdownItem[]; selectedItemId?: string | number | null }[] = [];

vi.mock('../../ui/MenuDropdown', () => ({
  default: ({
    items,
    selectedItemId,
    children
  }: {
    items: MenuDropdownItem[];
    selectedItemId?: string | number | null;
    children: React.ReactNode;
  }) => {
    capturedProps.push({ items, selectedItemId });
    return <>{children}</>;
  }
}));

import HttpMethodSelector from './HttpMethodSelector';

const render = (method: string): string =>
  renderToStaticMarkup(<HttpMethodSelector method={method} onMethodChange={() => {}} testId="method-select" />);

const itemIds = (method: string): string[] => {
  render(method);
  return capturedProps[0].items.map((item) => String(item.id));
};

beforeEach(() => {
  capturedProps.length = 0;
});

describe('HttpMethodSelector options', () => {
  it('offers all nine standard HTTP methods, in the order the app lists them', () => {
    const methodIds = itemIds('GET').filter((id) => !id.startsWith('add-custom'));
    expect(methodIds).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT']);
  });

  it('offers an "+ Add Custom" link row last, with no separator above it', () => {
    render('GET');
    const items = capturedProps[0].items;
    const addCustom = items[items.length - 1];
    expect(addCustom.id).toBe('add-custom');
    expect(addCustom.label).toBe('+ Add Custom');
    expect(addCustom.className).toBe('dropdown-item-link');
    expect(items.some((item) => item.type === 'divider')).toBe(false);
  });

  // The query bar drives an HTTP client, so non-HTTP protocols must never be
  // selectable even though they share the method-colour map.
  it.each(['GRAPHQL', 'GQL', 'GRPC', 'WEBSOCKET', 'WS'])('does not offer the non-HTTP protocol %s', (protocol) => {
    expect(itemIds('GET')).not.toContain(protocol);
  });
});

describe('HttpMethodSelector selected row', () => {
  it('marks the matching row for a standard method', () => {
    render('TRACE');
    expect(capturedProps[0].selectedItemId).toBe('TRACE');
  });

  // Collections may store the method lower-cased; the rows are upper-cased ids.
  it('matches a lower-cased stored method', () => {
    render('patch');
    expect(capturedProps[0].selectedItemId).toBe('PATCH');
  });

  it('marks no row for a custom method', () => {
    render('PURGE');
    expect(capturedProps[0].selectedItemId).toBeNull();
  });
});

describe('HttpMethodSelector trigger', () => {
  it('shows the method in full, unabbreviated', () => {
    expect(render('DELETE')).toContain('DELETE');
    expect(render('OPTIONS')).toContain('OPTIONS');
  });

  it('shows a custom method as typed', () => {
    expect(render('PURGE')).toContain('PURGE');
  });

  it('announces the current method to assistive tech', () => {
    expect(render('TRACE')).toContain('aria-label="HTTP method: TRACE"');
  });

  it('tooltips the resolved method, not the raw stored value', () => {
    expect(render('purge')).toContain('title="PURGE"');
  });
});
