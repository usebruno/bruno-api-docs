import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SearchResultItem } from './SearchResultItem';
import type { RequestSearchRecord, FolderSearchRecord } from '../searchIndex';

// Match "<text>" wrapped in a bold element, regardless of its attributes, so the
// assertion keys off the tag (the highlight contract) and not a styling class.
const boldElement = /<b(?:\s[^>]*)?>([^<]*)<\/b>/g;
const boldedText = (html: string): string[] => [...html.matchAll(boldElement)].map((m) => m[1]);

const record: RequestSearchRecord = {
  type: 'request',
  id: 'u1',
  slug: 'hotels/get-all',
  name: 'Get All Hotels',
  method: 'GET',
  ancestorNames: ['Hotels', 'Browse & search'],
  ancestorSlugs: ['hotels'],
  url: '{{baseUrl}}/api/v1/hotels'
};

const folder: FolderSearchRecord = {
  type: 'folder',
  id: 'f1',
  slug: 'billing/customers/basic-auth',
  name: 'Basic Auth',
  ancestorNames: ['Billing', 'Customers'],
  ancestorSlugs: ['billing', 'billing/customers'],
  requestCount: 12
};

describe('SearchResultItem', () => {
  it('renders method label, name, breadcrumb and url', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={record} onSelect={() => {}} />);
    expect(html).toContain('GET');
    expect(html).toContain('Get All Hotels');
    expect(html).toContain('Hotels / Browse &amp; search');
    expect(html).toContain('/api/v1/hotels');
  });

  it('omits the url line when there is no url', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={{ ...record, url: '' }} onSelect={() => {}} />);
    expect(html).not.toContain('class="search-result-url"');
  });

  it('wraps the matched ranges of a field in a bold element', () => {
    // "Hotels" sits at indices 8-13 of "Get All Hotels".
    const html = renderToStaticMarkup(
      <SearchResultItem record={record} matches={{ name: [[8, 13]] }} onSelect={() => {}} />
    );
    expect(boldedText(html)).toContain('Hotels');
  });

  it('renders plain text (no bold element) when a field has no matches', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={record} matches={{}} onSelect={() => {}} />);
    expect(boldedText(html)).toHaveLength(0);
  });

  it('shows a deep breadcrumb elided, naming the node with the whole chain', () => {
    const deep = { ...record, ancestorNames: ['Hotels', 'Auth', 'Auth 2', 'Legacy', 'v3'] };
    const html = renderToStaticMarkup(<SearchResultItem record={deep} onSelect={() => {}} />);
    expect(html).toContain('Hotels / … / v3');
    // The hidden folders are unreachable by pointer for keyboard and AT users,
    // so the label has to carry them.
    expect(html).toContain('aria-label="Hotels / Auth / Auth 2 / Legacy / v3"');
  });

  it('leaves a chain shown whole unlabelled (its text is already the full path)', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={record} onSelect={() => {}} />);
    expect(html).toContain('Hotels / Browse &amp; search');
    expect(html).not.toContain('aria-label=');
  });
});

describe('SearchResultItem - folder variant', () => {
  it('renders the folder glyph, name and request count', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={folder} onSelect={() => {}} />);
    expect(html).toContain('data-testid="search-result-folder-icon"');
    expect(html).toContain('Basic Auth');
    expect(html).toContain('12 requests');
  });

  it('names its kind for screen readers, since the glyph is decorative', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={folder} onSelect={() => {}} />);
    expect(html).toContain('Folder: ');
  });

  it('singularises a folder holding one request', () => {
    const html = renderToStaticMarkup(
      <SearchResultItem record={{ ...folder, requestCount: 1 }} onSelect={() => {}} />
    );
    expect(html).toContain('1 request');
    expect(html).not.toContain('1 requests');
  });

  it('carries no method or url (a folder is not an endpoint)', () => {
    const html = renderToStaticMarkup(<SearchResultItem record={folder} onSelect={() => {}} />);
    expect(html).not.toContain('class="search-result-method"');
    expect(html).not.toContain('class="search-result-url"');
  });

  it('shows its breadcrumb, so two same-named folders can be told apart', () => {
    const billing = renderToStaticMarkup(<SearchResultItem record={folder} onSelect={() => {}} />);
    const products = renderToStaticMarkup(
      <SearchResultItem record={{ ...folder, ancestorNames: ['Products', 'Users'] }} onSelect={() => {}} />
    );
    expect(billing).toContain('Billing / Customers');
    expect(products).toContain('Products / Users');
  });

  it('elides a deep folder breadcrumb the same way a request one is elided', () => {
    const deep = { ...folder, ancestorNames: ['Billing', 'Customers', 'Payment', 'Legacy'] };
    const html = renderToStaticMarkup(<SearchResultItem record={deep} onSelect={() => {}} />);
    expect(html).toContain('Billing / … / Legacy');
    expect(html).toContain('aria-label="Billing / Customers / Payment / Legacy"');
  });

  it('omits the breadcrumb for a top-level folder (there is no chain)', () => {
    const html = renderToStaticMarkup(
      <SearchResultItem record={{ ...folder, ancestorNames: [] }} onSelect={() => {}} />
    );
    expect(html).not.toContain('class="search-result-breadcrumb"');
  });

  it('bolds the matched range of the folder name', () => {
    // "Auth" sits at indices 6-9 of "Basic Auth".
    const html = renderToStaticMarkup(
      <SearchResultItem record={folder} matches={{ name: [[6, 9]] }} onSelect={() => {}} />
    );
    expect(boldedText(html)).toContain('Auth');
  });
});
