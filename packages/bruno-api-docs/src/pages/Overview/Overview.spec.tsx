import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { query, getByTestId, queryByTestId } from '@/test-utils/dom';
import { Overview } from './Overview';

/** Every Overview section shares one test id, so find a section by its text. */
const sectionNamed = (root: ReturnType<typeof useRenderToDom>, name: string) => {
  const match = root
    .querySelectorAll('[data-testid="overview-section-label"]')
    .find((section) => section.text.includes(name));
  if (!match) throw new Error(`No section named ${name}`);
  return match;
};

describe('Overview', () => {
  it('renders the headline, stats, docs and configuration', () => {
    const collection: OpenCollection = {
      info: { name: 'Hotel Booking API', version: '1.0.0' },
      config: { environments: [{ name: 'Development', variables: [{ name: 'baseUrl', value: 'x' }] }] },
      request: { headers: [{ name: 'Accept', value: 'application/json' }] },
      docs: '# Getting started\nUse this API.'
    };

    const html = renderToStaticMarkup(<Overview collection={collection} />);

    expect(html).toContain('Hotel Booking API');
    expect(html).toContain('Version : 1.0.0');
    expect(html).toContain('Accept');
    expect(html).toContain('application/json');
    expect(html).toContain('Getting started'); // collection docs rendered
    expect(html).toContain('Collection Configuration');
  });

  it('shows no collection-level tags, which the desktop app does not support', () => {
    const collection = {
      info: { name: 'Tagged API', version: '1.0.0', tags: ['public'] }
    } as unknown as OpenCollection;

    const html = renderToStaticMarkup(<Overview collection={collection} />);

    expect(html).not.toContain('overview-tags');
    expect(html).not.toContain('public');
  });

  it('renders an empty-state placeholder for each section when the collection is bare', () => {
    const collection: OpenCollection = {
      info: { name: 'Empty API', version: '1.0.0' }
    };

    const html = renderToStaticMarkup(<Overview collection={collection} />);

    expect(html).toContain('No overview content yet');
    expect(html).toContain('No configuration set');
  });
});

describe('Overview execution context section', () => {
  it('splits collection configuration from the execution context', () => {
    const collection: OpenCollection = {
      info: { name: 'Hotel Booking API' },
      request: {
        headers: [{ name: 'Accept', value: 'application/json' }],
        scripts: [{ type: 'before-request', code: 'pre()' }]
      }
    } as unknown as OpenCollection;

    const root = useRenderToDom(<Overview collection={collection} />);

    expect(getByTestId(sectionNamed(root, 'Collection Configuration'), 'collection-config-headers-subheading')).not.toBeNull();
    expect(getByTestId(sectionNamed(root, 'Execution Context'), 'collection-execution-context-script-subheading')).not.toBeNull();
    expect(queryByTestId(root, 'collection-execution-context-empty')).toBeNull();
  });

  it('shows the Execution Context empty state, not an accordion, when the collection has no vars, scripts or tests', () => {
    const collection: OpenCollection = {
      info: { name: 'Hotel Booking API' },
      request: { headers: [{ name: 'Accept', value: 'application/json' }] }
    } as unknown as OpenCollection;

    const root = useRenderToDom(<Overview collection={collection} />);
    const executionSection = sectionNamed(root, 'Execution Context');

    expect(getByTestId(executionSection, 'collection-execution-context-empty-heading').text.trim()).toBe('No execution context');
    expect(executionSection.querySelector('button')).toBeNull();
    expect(queryByTestId(root, 'collection-execution-context')).toBeNull();
  });

  it('drops the Collection Configuration section when the collection only has an execution context', () => {
    const collection: OpenCollection = {
      info: { name: 'Hotel Booking API' },
      request: { scripts: [{ type: 'before-request', code: 'pre()' }] }
    } as unknown as OpenCollection;

    const root = useRenderToDom(<Overview collection={collection} />);

    expect(queryByTestId(root, 'collection-config')).toBeNull();
    expect(root.text).not.toContain('Collection Configuration');
    expect(getByTestId(root, 'collection-execution-context-script-subheading').text.trim()).toBe('Script');
  });
});

describe('Overview execution context accordion', () => {
  it('renders the Execution Context section as an expanded accordion', () => {
    const collection: OpenCollection = {
      info: { name: 'Hotel Booking API' },
      request: {
        headers: [{ name: 'Accept', value: 'application/json' }],
        scripts: [{ type: 'before-request', code: 'pre()' }]
      }
    } as unknown as OpenCollection;

    const root = useRenderToDom(<Overview collection={collection} />);
    const toggle = query(sectionNamed(root, 'Execution Context'), 'button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});
