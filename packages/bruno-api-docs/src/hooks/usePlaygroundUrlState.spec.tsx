import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId } from '@/test-utils/dom';
import { usePlaygroundUrlState } from './usePlaygroundUrlState';

const Probe: React.FC<{ hidePlayground?: boolean }> = ({ hidePlayground }) => {
  const { open, dock, requestSlug, disabled } = usePlaygroundUrlState(hidePlayground);
  return (
    <span
      data-testid="probe"
      data-open={String(open)}
      data-dock={dock}
      data-req={requestSlug ?? ''}
      data-disabled={String(disabled)}
    />
  );
};

const useProbeAt = (url: string, hidePlayground?: boolean) =>
  getByTestId(
    useRenderToDom(
      <MemoryRouter initialEntries={[url]}>
        <Probe hidePlayground={hidePlayground} />
      </MemoryRouter>
    ),
    'probe'
  );

describe('usePlaygroundUrlState (read path)', () => {
  it('reports closed with the default dock when no params are present', () => {
    const probe = useProbeAt('/');
    expect(probe.getAttribute('data-open')).toBe('false');
    expect(probe.getAttribute('data-dock')).toBe('bottom');
    expect(probe.getAttribute('data-req')).toBe('');
    expect(probe.getAttribute('data-disabled')).toBe('false');
  });

  it('reads open, dock and request slug from the query', () => {
    const probe = useProbeAt('/?pg=1&dock=inline&pgReq=users/get');
    expect(probe.getAttribute('data-open')).toBe('true');
    expect(probe.getAttribute('data-dock')).toBe('inline');
    expect(probe.getAttribute('data-req')).toBe('users/get');
  });

  it('reflects the modal dock', () => {
    expect(useProbeAt('/?pg=1&dock=modal').getAttribute('data-dock')).toBe('modal');
  });

  it('reports closed and disabled for a playground deep link when hidePlayground is passed', () => {
    const probe = useProbeAt('/?pg=1&dock=inline&pgReq=users/get', true);
    expect(probe.getAttribute('data-open')).toBe('false');
    expect(probe.getAttribute('data-disabled')).toBe('true');
  });

  it('reports closed and disabled for a playground deep link that carries hidePlayground=1', () => {
    const probe = useProbeAt('/?pg=1&dock=inline&hidePlayground=1');
    expect(probe.getAttribute('data-open')).toBe('false');
    expect(probe.getAttribute('data-disabled')).toBe('true');
  });
});
