import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { Section } from './Section';

describe('Section', () => {
  it('renders the label and its content', () => {
    const html = renderToStaticMarkup(
      <Section label="Environments">
        <p>List content</p>
      </Section>
    );
    expect(html).toContain('Environments');
    expect(html).toContain('List content');
  });

  it('applies labelClassName to the label for styling while keeping the underlying text unchanged', () => {
    const html = renderToStaticMarkup(
      <Section label="Headers" labelClassName="section-label-lower">
        <p>content</p>
      </Section>
    );
    expect(html).toContain('section-label-lower');
    expect(html).toContain('Headers');
  });
});
