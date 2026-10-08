import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

vi.mock('@/ui/Portal/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children
}));

describe('Modal', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <Modal open={false} onClose={() => {}}>
        <p>body</p>
      </Modal>
    );
    expect(html).toBe('');
  });

  it('renders an accessible dialog with the title, close button and children when open', () => {
    const html = renderToStaticMarkup(
      <Modal open onClose={() => {}} title={<span>Code snippet</span>}>
        <p>snippet body</p>
      </Modal>
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Code snippet');
    expect(html).toContain('snippet body');
    expect(html).toContain('aria-label="Close"');
  });

  it('omits the title slot when no title is provided but keeps the close button', () => {
    const html = renderToStaticMarkup(
      <Modal open onClose={() => {}} ariaLabel="Plain dialog">
        <p>body</p>
      </Modal>
    );
    expect(html).not.toContain('class="modal-title"');
    expect(html).toContain('aria-label="Plain dialog"');
    expect(html).toContain('aria-label="Close"');
  });

  it('defaults to the large size and renders no footer slot', () => {
    const html = renderToStaticMarkup(
      <Modal open onClose={() => {}}>
        <p>body</p>
      </Modal>
    );
    expect(html).toContain('class="modal-dialog is-lg"');
    expect(html).not.toContain('class="modal-foot"');
  });

  it('applies the requested size and renders the footer slot', () => {
    const html = renderToStaticMarkup(
      <Modal open onClose={() => {}} size="md" footer={<span>footer content</span>} testId="example-modal">
        <p>body</p>
      </Modal>
    );
    expect(html).toContain('class="modal-dialog is-md"');
    expect(html).toContain('data-testid="example-modal"');
    expect(html).toContain('data-testid="example-modal-backdrop"');
    expect(html).toContain('data-testid="example-modal-close"');
    expect(html).toContain('class="modal-foot"');
    expect(html).toContain('footer content');
  });
});
