import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import type { ResponseBodyFormat } from '@/constants';
import { FORMAT_LABELS } from '@/constants';
import ResponseFormatSelector from './ResponseFormatter';

const ICON_TESTID = 'response-format-selector-trigger-icon';

// The trigger renders the selected format's tabler icon; each format maps to a distinct icon class.
const FORMAT_ICON_CLASS: Record<ResponseBodyFormat, string> = {
  json: 'icon-tabler-braces',
  html: 'icon-tabler-code',
  xml: 'icon-tabler-file-code',
  javascript: 'icon-tabler-brand-javascript',
  raw: 'icon-tabler-file-text',
  hex: 'icon-tabler-hexagons',
  base64: 'icon-tabler-binary-tree'
};

const render = (props: Partial<React.ComponentProps<typeof ResponseFormatSelector>> = {}) =>
  renderToStaticMarkup(<ResponseFormatSelector toggleView={() => {}} {...props} />);

// Vitest runs in a node environment and asserts on SSR markup; Tippy only mounts the menu surface
// (items, preview toggle) when the dropdown opens, so unit coverage is the always-rendered trigger.
// The menu items, group collapsing, and preview toggle are exercised by the Playwright e2e specs.
describe('ResponseFormatSelector', () => {
  describe('trigger icon — format icon when preview is off', () => {
    (Object.keys(FORMAT_ICON_CLASS) as ResponseBodyFormat[]).forEach((format) => {
      it(`shows the ${format} icon and its label`, () => {
        const html = render({ selectedFormat: format, showPreview: false });
        expect(html).toContain(`data-testid="${ICON_TESTID}"`);
        expect(html).toContain(FORMAT_ICON_CLASS[format]);
        expect(html).toContain(FORMAT_LABELS[format]);
        expect(html).not.toContain('icon-tabler-eye');
      });
    });
  });

  describe('trigger icon — eye icon when preview is on', () => {
    it('swaps the format icon for the eye when a format is selected', () => {
      const html = render({ selectedFormat: 'json', showPreview: true });
      expect(html).toContain(`data-testid="${ICON_TESTID}"`);
      expect(html).toContain('icon-tabler-eye');
      expect(html).not.toContain('icon-tabler-braces');
      // The format label still accompanies the eye icon.
      expect(html).toContain(FORMAT_LABELS.json);
    });

    it('shows the eye for every format while preview is on', () => {
      (Object.keys(FORMAT_ICON_CLASS) as ResponseBodyFormat[]).forEach((format) => {
        const html = render({ selectedFormat: format, showPreview: true });
        expect(html).toContain('icon-tabler-eye');
        expect(html).not.toContain(FORMAT_ICON_CLASS[format]);
      });
    });
  });

  describe('trigger icon — absent cases', () => {
    it('renders no icon when no format is selected and preview is off', () => {
      const html = render({ showPreview: false });
      expect(html).not.toContain(ICON_TESTID);
      expect(html).not.toContain('icon-tabler-eye');
    });

    // The trigger content is produced by `itemToText`, which MenuDropdown only invokes for a
    // selected item. Preview is always a view of a selected format, so this degenerate combination
    // does not occur in practice — the trigger simply renders empty.
    it('renders no icon when preview is on but no format is selected', () => {
      const html = render({ showPreview: true });
      expect(html).not.toContain(ICON_TESTID);
      expect(html).not.toContain('icon-tabler-eye');
    });

    it('treats an omitted showPreview as off (format icon, not eye)', () => {
      const html = render({ selectedFormat: 'xml' });
      expect(html).toContain(FORMAT_ICON_CLASS.xml);
      expect(html).not.toContain('icon-tabler-eye');
    });
  });

  describe('trigger element', () => {
    it('renders the default trigger with the selector testId, closed by default', () => {
      const html = render({ selectedFormat: 'json' });
      expect(html).toContain('data-testid="response-format-selector"');
      expect(html).toContain('menu-dropdown-trigger');
      expect(html).toContain('aria-expanded="false"');
      // Closed: the menu surface (and its items) is not rendered server-side.
      expect(html).not.toContain('role="menu"');
      expect(html).not.toContain('response-format-selector-json');
    });

    it('exposes a menu-style trigger for assistive tech', () => {
      const html = render({ selectedFormat: 'json' });
      expect(html).toContain('aria-haspopup="menu"');
    });

    it('marks the trigger icon aria-hidden so only the label is announced', () => {
      const html = render({ selectedFormat: 'json' });
      expect(html).toMatch(/aria-hidden[^>]*data-testid="response-format-selector-trigger-icon"|data-testid="response-format-selector-trigger-icon"[^>]*aria-hidden/);
    });
  });
});
