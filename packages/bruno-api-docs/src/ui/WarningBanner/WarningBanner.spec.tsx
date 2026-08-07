import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import WarningBanner from './WarningBanner';

const SET_MAX_REDIRECTS = 'req.setMaxRedirects is not currently supported in the Bruno playground. Please use the Bruno desktop app.';
const ON_FAIL = 'req.onFail is not currently supported in the Bruno playground. Please use the Bruno desktop app.';

describe('WarningBanner', () => {
  it('renders the message under a singular title for one warning', () => {
    const html = renderToStaticMarkup(<WarningBanner warnings={[SET_MAX_REDIRECTS]} />);
    expect(html).toContain('data-testid="warning-banner"');
    expect(html).toContain('>Warning</div>');
    expect(html).not.toContain('>Warnings</div>');
    expect(html).toContain(SET_MAX_REDIRECTS);
  });

  it('uses a plural title and lists every message when there is more than one warning', () => {
    const html = renderToStaticMarkup(<WarningBanner warnings={[SET_MAX_REDIRECTS, ON_FAIL]} />);
    expect(html).toContain('>Warnings</div>');
    expect(html).toContain(SET_MAX_REDIRECTS);
    expect(html).toContain(ON_FAIL);
  });

  it('renders nothing when there are no warnings', () => {
    expect(renderToStaticMarkup(<WarningBanner warnings={[]} />)).toBe('');
  });
});
