import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { usePlaygroundUrlState } from './usePlaygroundUrlState';

const Probe: React.FC<{ hidePlayground?: boolean }> = ({ hidePlayground }) => {
  const { open, dock, requestSlug, disabled } = usePlaygroundUrlState(hidePlayground);
  return (
    <span data-open={String(open)} data-dock={dock} data-req={requestSlug ?? ''} data-disabled={String(disabled)} />
  );
};

const renderAt = (url: string, hidePlayground?: boolean): string =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <Probe hidePlayground={hidePlayground} />
    </MemoryRouter>
  );

describe('usePlaygroundUrlState (read path)', () => {
  it('reports closed with the default dock when no params are present', () => {
    const html = renderAt('/');
    expect(html).toContain('data-open="false"');
    expect(html).toContain('data-dock="bottom"');
    expect(html).toContain('data-req=""');
    expect(html).toContain('data-disabled="false"');
  });

  it('reads open, dock and request slug from the query', () => {
    const html = renderAt('/?pg=1&dock=inline&pgReq=users/get');
    expect(html).toContain('data-open="true"');
    expect(html).toContain('data-dock="inline"');
    expect(html).toContain('data-req="users/get"');
  });

  it('reflects the modal dock', () => {
    expect(renderAt('/?pg=1&dock=modal')).toContain('data-dock="modal"');
  });

  it('reports closed and disabled for a playground deep link when hidePlayground is passed', () => {
    const html = renderAt('/?pg=1&dock=inline&pgReq=users/get', true);
    expect(html).toContain('data-open="false"');
    expect(html).toContain('data-disabled="true"');
  });

  it('reports closed and disabled for a playground deep link that carries hidePlayground=1', () => {
    const html = renderAt('/?pg=1&dock=inline&hidePlayground=1');
    expect(html).toContain('data-open="false"');
    expect(html).toContain('data-disabled="true"');
  });
});
