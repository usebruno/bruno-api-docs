import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import type { RunRequestResponse } from '@/runner';
import { createOpenCollectionStore } from '@/store/store';
import { query, getByTestId } from '@/test-utils/dom';
import ResponseActions from './ResponseActions';

const baseResponse: RunRequestResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  data: { hello: 'world' },
  base64Data: Buffer.from('{"hello":"world"}').toString('base64'),
  url: 'http://localhost:8081/api/users'
};

const render = (props: Partial<React.ComponentProps<typeof ResponseActions>> = {}) => {
  const store = createOpenCollectionStore();
  const root = parse(
    renderToStaticMarkup(
      <Provider store={store}>
        <ResponseActions
          orientation="horizontal"
          itemUuid="item-1"
          response={baseResponse}
          selectedFormat="json"
          showPreview={false}
          {...props}
        />
      </Provider>
    )
  );
  root.querySelectorAll('style').forEach((style) => style.remove());
  return root;
};

// Buttons render in two mirrored groups: an inline `actions-buttons` block (shown when the pane is
// wide) and a collapsed kebab `actions-dropdown` (shown when narrow). CSS toggles which is visible;
// both exist in the static markup. The inline group is the one carrying the individual buttons.
const inlineButton = (root: ReturnType<typeof render>, label: string) =>
  query(getByTestId(root, 'actions-buttons'), `[aria-label="${label}"]`);

describe('ResponseActions', () => {
  it('renders the actions wrapper with both the inline and collapsed groups', () => {
    const root = render();
    expect(getByTestId(root, 'response-pane-actions-wrapper')).toBeTruthy();
    expect(getByTestId(root, 'actions-buttons')).toBeTruthy();
    expect(getByTestId(root, 'actions-dropdown')).toBeTruthy();
  });

  it('exposes Copy, Download, Clear and Change Layout as inline icon buttons', () => {
    const root = render();
    expect(inlineButton(root, 'Copy Response')).toBeTruthy();
    expect(inlineButton(root, 'Download Response')).toBeTruthy();
    expect(inlineButton(root, 'Clear Response')).toBeTruthy();
    expect(inlineButton(root, 'Change Layout')).toBeTruthy();
  });

  describe('Copy Response', () => {
    it('shows the copy icon and is enabled when the response has data', () => {
      const button = inlineButton(render(), 'Copy Response');
      expect(button.innerHTML).toContain('icon-tabler-copy');
      expect(button.innerHTML).not.toContain('icon-tabler-check');
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('is disabled when the response has no data', () => {
      const button = inlineButton(render({ response: { ...baseResponse, data: undefined } }), 'Copy Response');
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Download Response', () => {
    it('shows the download icon and is enabled when raw bytes are present', () => {
      const button = inlineButton(render(), 'Download Response');
      expect(button.innerHTML).toContain('icon-tabler-download');
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('is disabled when the response carries no base64 bytes', () => {
      const button = inlineButton(render({ response: { ...baseResponse, base64Data: undefined } }), 'Download Response');
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Clear Response', () => {
    it('shows the eraser icon and is always enabled', () => {
      const button = inlineButton(render(), 'Clear Response');
      expect(button.innerHTML).toContain('icon-tabler-eraser');
      expect(button.hasAttribute('disabled')).toBe(false);
    });

    it('stays enabled even when there is nothing to copy or download', () => {
      const button = inlineButton(
        render({ response: { ...baseResponse, data: undefined, base64Data: undefined } }),
        'Clear Response'
      );
      expect(button.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Change Layout', () => {
    it('shows the columns icon in the vertical orientation', () => {
      const button = inlineButton(render({ orientation: 'vertical' }), 'Change Layout');
      expect(button.innerHTML).toContain('icon-tabler-layout-columns');
      expect(button.innerHTML).not.toContain('icon-tabler-layout-rows');
    });

    it('shows the rows icon in the horizontal orientation', () => {
      const button = inlineButton(render({ orientation: 'horizontal' }), 'Change Layout');
      expect(button.innerHTML).toContain('icon-tabler-layout-rows');
      expect(button.innerHTML).not.toContain('icon-tabler-layout-columns');
    });
  });

  describe('collapsed kebab menu', () => {
    it('renders the "More actions" dropdown trigger, closed by default', () => {
      const root = render();
      const trigger = query(getByTestId(root, 'actions-dropdown'), '[data-testid="response-actions-menu"]');
      expect(trigger.getAttribute('aria-label')).toBe('More actions');
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.innerHTML).toContain('icon-tabler-dots');
      // Closed: the menu surface and its items are not in the static markup.
      expect(root.querySelector('[role="menu"]')).toBeNull();
    });
  });
});
