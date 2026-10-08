import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { query } from '@/test-utils/dom';
import { PropertyTable } from './PropertyTable';

describe('PropertyTable', () => {
  it('renders label/value rows', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Accept', value: 'application/json' }]} />);
    expect(query(root, '.property-key').text).toContain('Accept');
    expect(query(root, '.property-value-cell').text).toContain('application/json');
  });

  it('keeps a very long name on one truncatable line, so it can ellipsise and show a tooltip', () => {
    const longName = 'collection_pre_var'.repeat(8);
    const root = useRenderToDom(<PropertyTable rows={[{ label: longName, value: 'v' }]} />);
    const key = query(root, '.property-key');

    expect(query(key, '.oc-truncate')).toBeTruthy();
    expect(key.text).toContain(longName);
  });

  it('shows (empty) instead of a blank space when a row has no value', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'coll_empty_value', value: '' }]} />);
    expect(query(root, '.property-value-placeholder').text).toBe('(empty)');
  });

  it('shows (empty) when the value is missing altogether', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'coll_empty_value' }]} />);
    expect(query(root, '.property-value-placeholder').text).toBe('(empty)');
  });

  it('hides the data type label for a row with no value, since there is nothing to describe', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'coll_empty_value', value: '', type: 'string' }]} />);
    expect(root.querySelector('.property-type')).toBeNull();
    expect(query(root, '.property-value-cell').text).not.toContain('string');
  });

  it('still shows the data type once a row has a value', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'clientId', value: 'docs-qa', type: 'string' }]} />);
    expect(query(root, '.property-type').text).toBe('string');
  });

  it('keeps a value of "0" rather than treating it as empty', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'retries', value: '0', type: 'number' }]} />);
    expect(root.querySelector('.property-value-placeholder')).toBeNull();
    expect(query(root, '.property-type').text).toBe('number');
  });

  it('leaves an empty secret masked rather than showing (empty)', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Token', value: '', secret: true }]} />);
    expect(root.querySelector('.property-value-placeholder')).toBeNull();
  });

  it('masks secret values', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Token', value: 's3cr3t', secret: true }]} />);
    const value = query(root, '.property-value-cell');
    expect(query(root, '.property-key').text).toContain('Token');
    expect(value.querySelector('.secret-value-text')).not.toBeNull();
    expect(value.text).not.toContain('s3cr3t');
  });

  it('shows the empty message when there are no rows', () => {
    const root = useRenderToDom(<PropertyTable rows={[]} emptyMessage="Nothing here yet" />);
    expect(query(root, '[data-testid="property-table-empty"]').text).toBe('Nothing here yet');
  });

  it('renders custom node cells', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Custom', node: <em>hi</em> }]} />);
    expect(query(root, '.property-value-cell em').text).toBe('hi');
  });

  it('renders a description as a truncatable line under the value (reuses Description)', () => {
    const root = useRenderToDom(
      <PropertyTable rows={[{ label: 'baseURL', value: 'https://api', description: '  API base URL  ' }]} />
    );
    expect(query(root, '.description.oc-truncate').text).toBe('API base URL');
  });

  it('omits the description line when a row has none', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'baseURL', value: 'https://api' }]} />);
    expect(root.querySelector('.description')).toBeNull();
  });

  it('shows a type label next to the value when a type is given', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'X-Trace-Id', value: '{{randomUUID}}', type: 'uuid' }]} />);
    expect(query(root, '.property-type').text).toBe('uuid');
  });

  it('omits the type label when no type is given', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Accept', value: 'application/json' }]} />);
    expect(root.querySelector('.property-type')).toBeNull();
  });

  it('renders the inherited-source link as a row-level cell (sibling of the value line) so it can center across the whole row', () => {
    const root = useRenderToDom(
      <PropertyTable
        rows={[{ label: 'X-Trace', value: 'abc', disabled: true, inheritedSource: { level: 'folder', name: 'Parent', uuid: 'p1' } }]}
        onNavigate={() => {}}
      />
    );
    expect(query(root, '.property-row').querySelector('[data-testid="inherited-source"]')).not.toBeNull();
    expect(query(root, '.property-value-line').querySelector('[data-testid="inherited-source"]')).toBeNull();
    expect(query(root, '.property-value-line').querySelector('.disabled-badge')).not.toBeNull();
  });

  it('omits the inherited-source link when a row is not inherited', () => {
    const root = useRenderToDom(<PropertyTable rows={[{ label: 'Accept', value: 'application/json' }]} />);
    expect(query(root, '.property-row').querySelector('[data-testid="inherited-source"]')).toBeNull();
  });
});
