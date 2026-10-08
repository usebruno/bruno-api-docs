import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { OpenInBrunoModal, BRUNO_DOWNLOAD_URL } from './OpenInBrunoModal';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, queryByTestId } from '@/test-utils/dom';

vi.mock('@/ui/Portal/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children
}));

const modalElement = (open = true) => (
  <OpenInBrunoModal open={open} onClose={() => {}} filename="hotel-booking-api.yml" onDownload={() => {}} testId="oib" />
);

describe('OpenInBrunoModal', () => {
  it('renders nothing while closed', () => {
    expect(queryByTestId(useRenderToDom(modalElement(false)), 'oib')).toBeNull();
  });

  it('puts the test id on the dialog and renders the title with the glyph and a download button', () => {
    const root = useRenderToDom(modalElement());
    expect(getByTestId(root, 'oib').getAttribute('role')).toBe('dialog');
    expect(getByTestId(root, 'oib-title').text).toContain('Open in Bruno');
    expect(getByTestId(root, 'oib-glyph')).not.toBeNull();
    const button = getByTestId(root, 'oib-download');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.text).toContain('Download Collection');
  });

  it('lists two import steps and names the downloaded file', () => {
    const root = useRenderToDom(modalElement());
    expect(getByTestId(root, 'oib-step-1').text).toContain('Import Collection');
    expect(getByTestId(root, 'oib-step-2').text).toContain('click Import');
    expect(getByTestId(root, 'oib-filename').text).toBe('hotel-booking-api.yml');
    expect(queryByTestId(root, 'oib-step-3')).toBeNull();
  });

  it('links to the Bruno downloads page in a new tab', () => {
    const link = getByTestId(useRenderToDom(modalElement()), 'oib-download-bruno');
    expect(link.getAttribute('href')).toBe(BRUNO_DOWNLOAD_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
