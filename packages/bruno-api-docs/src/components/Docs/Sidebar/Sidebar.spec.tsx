import React from 'react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { TestProviders } from '@/test-utils/providers';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { query } from '@/test-utils/dom';

const collection = {
  info: { name: 'C' },
  items: [
    { type: 'http', name: 'Login', method: 'POST', examples: [{ name: 'OK', response: { status: 200 } }] }
  ]
} as any;

// The highlight is read from the route, so render at the example's own path
// (<request-slug>/<example-slug>) - exactly the URL a sidebar example click
// navigates to.
const buildSidebar = () => {
  return (
    <TestProviders document={hydrateWithUUIDs(collection)}>
      <MemoryRouter initialEntries={['/login/ok']}>
        <Sidebar folders={{ isCollapsed: () => true, toggle: () => {}, expand: () => {} }} />
      </MemoryRouter>
    </TestProviders>
  );
};

describe('Sidebar examples', () => {
  it('renders the highlighted example as an active sidebar row', () => {
    const root = useRenderToDom(buildSidebar());
    const row = query(root, '[data-testid="sidebar-example"]');
    expect(row.text).toContain('OK');
    expect(row.getAttribute('class') ?? '').toContain('active');
  });
});
