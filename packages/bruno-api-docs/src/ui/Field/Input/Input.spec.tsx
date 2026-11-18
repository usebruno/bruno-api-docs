import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, it, expect } from 'vitest';
import { Input } from './Input';
import { query } from '@/test-utils/dom';

const noop = () => {};

const render = (ui: React.ReactElement) => {
  const root = parse(renderToStaticMarkup(ui));
  root.querySelectorAll('style').forEach((style) => style.remove());
  return root;
};

describe('Input', () => {
  it('renders a plain text input with value, placeholder, id and test id', () => {
    const root = render(<Input value="hello" onChange={noop} placeholder="Name" testId="my-input" id="my-input" />);
    const input = query(root, '.oc-input');
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('value')).toBe('hello');
    expect(input.getAttribute('placeholder')).toBe('Name');
    expect(input.getAttribute('data-testid')).toBe('my-input');
    expect(input.getAttribute('id')).toBe('my-input');
  });

  it('stays free of a reveal toggle when not secret', () => {
    const root = render(<Input value="7" onChange={noop} testId="n" />);
    expect(root.querySelector('.oc-input-toggle')).toBeNull();
  });

  it('masks a secret value and exposes an accessible reveal toggle', () => {
    const root = render(<Input value="secret" onChange={noop} secret testId="my-secret" />);
    expect(query(root, '.oc-input-wrapper').classNames).toContain('oc-input-wrapper--secret');
    expect(query(root, '[data-testid="my-secret"]').getAttribute('type')).toBe('password');
    const toggle = query(root, '[data-testid="my-secret-toggle"]');
    expect(toggle.getAttribute('aria-label')).toBe('Show value');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks a read-only input readonly and styles its wrapper as read-only', () => {
    const root = render(<Input value="admin" onChange={noop} readOnly testId="ro" />);
    expect(query(root, '[data-testid="ro"]').hasAttribute('readonly')).toBe(true);
    expect(query(root, '.oc-input-wrapper').classNames).toContain('oc-input-wrapper--readonly');
  });

  it('keeps the reveal toggle on a read-only secret', () => {
    const root = render(<Input value="secret" onChange={noop} secret readOnly testId="ro-secret" />);
    expect(query(root, '[data-testid="ro-secret"]').getAttribute('type')).toBe('password');
    expect(query(root, '[data-testid="ro-secret-toggle"]').getAttribute('aria-label')).toBe('Show value');
  });

  it('is editable by default', () => {
    const root = render(<Input value="x" onChange={noop} testId="rw" />);
    expect(query(root, '[data-testid="rw"]').hasAttribute('readonly')).toBe(false);
  });
});
