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

  it('gives the collapse toggle a test id derived from the section test id', () => {
    const html = renderToStaticMarkup(
      <Section label="Execution Context" collapsible testId="request-section-execution-context">
        <p>Scripts</p>
      </Section>
    );
    expect(html).toContain('data-testid="request-section-execution-context-toggle"');
  });
});
