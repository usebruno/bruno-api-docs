import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '../../../../../../hooks/useRenderToDom';
import { query, getByTestId, queryByTestId } from '../../../../../../test-utils/dom';
import EnvVarCards from './EnvVarCards';
import type { KeyValueRow } from '../../../../../../components/KeyValueTable/KeyValueTable';

const rows: KeyValueRow[] = [
  { id: '1', name: 'host', value: '', enabled: true },
  { id: '2', name: 'token', value: '', enabled: true, secret: true }
];

const rowWithDescription: KeyValueRow[] = [
  { id: '1', name: 'host', value: 'localhost', enabled: true, description: 'The API host' }
];

describe('EnvVarCards', () => {
  it('derives per-card indexed child test ids from the testId prop and labels the Name and Value fields', () => {
    const root = useRenderToDom(<EnvVarCards rows={rows} onChange={() => undefined} testId="env-var-cards" />);
    expect(getByTestId(root, 'env-var-cards')).toBeTruthy();
    expect(getByTestId(root, 'env-var-cards-name-input-0').getAttribute('placeholder')).toBe('Name');
    expect(getByTestId(root, 'env-var-cards-value-input-0').getAttribute('placeholder')).toBe('Value');
  });

  it('gives each card a unique indexed test id so multiple cards are individually addressable', () => {
    const root = useRenderToDom(<EnvVarCards rows={rows} onChange={() => undefined} testId="env-var-cards" />);
    // Two rows -> two distinct cards, each with its own -card-<index> / -name-input-<index> ids.
    expect(getByTestId(root, 'env-var-cards-card-0')).toBeTruthy();
    expect(getByTestId(root, 'env-var-cards-card-1')).toBeTruthy();
    expect(getByTestId(root, 'env-var-cards-name-input-0').getAttribute('value')).toBe('host');
    expect(getByTestId(root, 'env-var-cards-name-input-1').getAttribute('value')).toBe('token');
  });

  it('omits its test ids when no testId is given', () => {
    const root = useRenderToDom(<EnvVarCards rows={rows} onChange={() => undefined} />);
    expect(queryByTestId(root, 'env-var-cards')).toBeNull();
    expect(queryByTestId(root, 'env-var-cards-name-input-0')).toBeNull();
  });

  it('renders a secret row as a masked password input labelled Value', () => {
    const root = useRenderToDom(<EnvVarCards rows={rows} onChange={() => undefined} />);
    const secret = query(root, 'input[type="password"]');
    expect(secret.getAttribute('placeholder')).toBe('Value');
  });

  it('renders an editable Description field below the value when showDescription is set', () => {
    const root = useRenderToDom(
      <EnvVarCards rows={rows} onChange={() => undefined} showDescription testId="env-var-cards" />
    );
    expect(getByTestId(root, 'env-var-cards-description-input-0').getAttribute('placeholder')).toBe('Description');

    // The description sits after (below) the value within the first card's body.
    const order = query(root, '.env-card .body')
      .querySelectorAll('[data-testid]')
      .map((el) => el.getAttribute('data-testid'));
    expect(order.indexOf('env-var-cards-description-input-0')).toBeGreaterThan(
      order.indexOf('env-var-cards-value-input-0')
    );
  });

  it('shows the authored description as the Description field value', () => {
    const root = useRenderToDom(
      <EnvVarCards rows={rowWithDescription} onChange={() => undefined} showDescription testId="env-var-cards" />
    );
    expect(getByTestId(root, 'env-var-cards-description-input-0').text).toBe('The API host');
  });

  it('omits the Description field by default', () => {
    const root = useRenderToDom(<EnvVarCards rows={rows} onChange={() => undefined} testId="env-var-cards" />);
    expect(queryByTestId(root, 'env-var-cards-description-input-0')).toBeNull();
  });
});
