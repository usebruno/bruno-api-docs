import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@usebruno/api-shared/hooks/useRenderToDom';
import { TestProviders } from '@usebruno/api-shared/test-utils/providers';
import { getByTestId, queryByTestId } from '@usebruno/api-shared/test-utils/dom';
import PlaygroundHeader from './PlaygroundHeader';

const noop = () => undefined;

const useHeader = (ui: React.ReactElement) => useRenderToDom(<TestProviders>{ui}</TestProviders>);

describe('PlaygroundHeader', () => {
  it('renders the dock switcher by default', () => {
    const root = useHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} onConfigure={noop} />
    );
    expect(queryByTestId(root, 'playground-dock-switcher')).not.toBeNull();
    expect(queryByTestId(root, 'playground-close')).not.toBeNull();
  });

  it('hides the dock switcher when showDockSwitcher is false', () => {
    const root = useHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} onConfigure={noop} showDockSwitcher={false} />
    );
    expect(queryByTestId(root, 'playground-dock-switcher')).toBeNull();
    expect(queryByTestId(root, 'playground-sidebar-toggle')).not.toBeNull();
    expect(queryByTestId(root, 'playground-close')).not.toBeNull();
  });

  it('marks the sidebar toggle pressed and fills the icon when the sidebar is open', () => {
    const root = useHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} onConfigure={noop} sidebarOpen />
    );
    const toggle = getByTestId(root, 'playground-sidebar-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.querySelector('[fill="currentColor"]')).not.toBeNull();
  });

  it('leaves the sidebar toggle unpressed and the icon unfilled when the sidebar is closed', () => {
    const root = useHeader(
      <PlaygroundHeader dock="bottom" onDockChange={noop} onToggleSidebar={noop} onClose={noop} onConfigure={noop} />
    );
    const toggle = getByTestId(root, 'playground-sidebar-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.querySelector('[fill="currentColor"]')).toBeNull();
  });
});
