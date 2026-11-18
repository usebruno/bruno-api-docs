import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { createSession, SessionProvider, type Session } from '@usebruno/api-shared/session/session';
import ShowVarsToggle from './ShowVarsToggle';

const render = (configure?: (s: Session) => void): string => {
  const session = createSession();
  configure?.(session);
  return renderToStaticMarkup(
    <SessionProvider value={session}>
      <ShowVarsToggle />
    </SessionProvider>
  );
};

describe('ShowVarsToggle', () => {
  it('renders a switch with the "Show vars" label, unchecked by default', () => {
    const html = render();
    expect(html).toContain('role="switch"');
    expect(html).toContain('Show vars');
    expect(html).toContain('aria-checked="false"');
  });

  it('reflects the showVars flag via aria-checked', () => {
    expect(render((s) => s.env.toggleShowVars())).toContain('aria-checked="true"');
  });
});
