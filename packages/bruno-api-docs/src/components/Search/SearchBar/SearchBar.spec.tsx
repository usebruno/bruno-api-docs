import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { SearchBar } from './SearchBar';
import { TestProviders } from '@/test-utils/providers';

const renderBar = () =>
  renderToStaticMarkup(
    <TestProviders>
      <MemoryRouter>
        <SearchBar open={false} onOpenChange={() => {}} />
      </MemoryRouter>
    </TestProviders>
  );

describe('SearchBar', () => {
  it('renders a collapsed combobox search field by default (no panel)', () => {
    const html = renderBar();
    expect(html).toContain('placeholder="Search requests, folders');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    // Closed: no filter row / results listbox rendered yet.
    expect(html).not.toContain('class="search-filters"');
    expect(html).not.toContain('role="listbox"');
  });
});
