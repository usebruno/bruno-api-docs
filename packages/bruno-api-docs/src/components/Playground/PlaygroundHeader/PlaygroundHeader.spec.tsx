import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { createOpenCollectionStore } from '@/store/store';
import PlaygroundHeader from './PlaygroundHeader';

const noop = () => undefined;

// The header holds the environment switcher, which reads the store and the URL.
const renderHeader = (ui: React.ReactElement) =>
  renderToStaticMarkup(
    <Provider store={createOpenCollectionStore()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );

describe('PlaygroundHeader', () => {
  it('renders the dock switcher by default', () => {
    const html = renderHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} />
    );
    expect(html).toContain('playground-dock-switcher');
    expect(html).toContain('playground-close');
  });

  it('hides the dock switcher when showDockSwitcher is false', () => {
    const html = renderHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} showDockSwitcher={false} />
    );
    expect(html).not.toContain('playground-dock-switcher');
    expect(html).toContain('playground-sidebar-toggle');
    expect(html).toContain('playground-close');
  });

  it('marks the sidebar toggle pressed and fills the icon when the sidebar is open', () => {
    const html = renderHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} sidebarOpen />
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('fill="currentColor"');
  });

  it('leaves the sidebar toggle unpressed and the icon unfilled when the sidebar is closed', () => {
    const html = renderHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} />
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('fill="currentColor"');
  });
});
