import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, it, expect } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { BodyModeSelector, resolveBodyMode } from './BodyModeSelector';
import type { RequestBody } from '@/utils/schemaHelpers';
import { getByTestId, query, queryByTestId } from '@/test-utils/dom';

const noop = () => {};

const render = (ui: React.ReactElement) => {
  const root = parse(renderToStaticMarkup(ui));
  root.querySelectorAll('style').forEach((style) => style.remove());
  return root;
};

describe('resolveBodyMode', () => {
  it('resolves undefined to No Body', () => {
    expect(resolveBodyMode(undefined)).toEqual({ type: 'none', label: 'No Body' });
  });

  it('resolves a json body', () => {
    expect(resolveBodyMode({ type: 'json', data: '' } as RequestBody)).toEqual({ type: 'json', label: 'JSON' });
  });

  it('resolves an xml body', () => {
    expect(resolveBodyMode({ type: 'xml', data: '' } as RequestBody)).toEqual({ type: 'xml', label: 'XML' });
  });

  it('resolves a text body', () => {
    expect(resolveBodyMode({ type: 'text', data: '' } as RequestBody)).toEqual({ type: 'text', label: 'TEXT' });
  });

  it('resolves a sparql body', () => {
    expect(resolveBodyMode({ type: 'sparql', data: '' } as RequestBody)).toEqual({ type: 'sparql', label: 'SPARQL' });
  });

  it('resolves a multipart-form body', () => {
    expect(resolveBodyMode({ type: 'multipart-form', data: [] } as RequestBody)).toEqual({
      type: 'multipart-form',
      label: 'Multipart Form'
    });
  });

  it('resolves a file body', () => {
    expect(resolveBodyMode({ type: 'file', data: [] } as RequestBody)).toEqual({ type: 'file', label: 'File / Binary' });
  });

  it('resolves a bare array to form-urlencoded', () => {
    expect(resolveBodyMode([] as RequestBody)).toEqual({ type: 'form-urlencoded', label: 'Form URL Encoded' });
  });
});

describe('BodyModeSelector', () => {
  const renderSelector = (body: RequestBody) =>
    render(<BodyModeSelector body={body} item={{} as HttpRequest} onItemChange={noop} />);

  it('shows the No Body label on the trigger for an undefined body', () => {
    const root = renderSelector(undefined);
    expect(getByTestId(root, 'body-type-select').text).toContain('No Body');
  });

  it('shows the JSON label on the trigger for a json body', () => {
    const root = renderSelector({ type: 'json', data: '' } as RequestBody);
    expect(getByTestId(root, 'body-type-select').text).toContain('JSON');
  });

  it('renders a caret icon on the trigger', () => {
    const root = renderSelector(undefined);
    expect(getByTestId(root, 'body-type-select').querySelector('svg')).toBeTruthy();
  });

  it('shows the icon for the body type the user has selected', () => {
    const trigger = getByTestId(renderSelector({ type: 'json', data: '' } as RequestBody), 'body-type-select');
    const icons = trigger.querySelectorAll('svg');
    expect(icons.length).toBe(2);
    expect(query(trigger, 'svg').getAttribute('class')).toContain('icon-tabler-braces');
  });

  it('shows a different icon when a different body type is selected', () => {
    const trigger = getByTestId(renderSelector({ type: 'xml', data: '' } as RequestBody), 'body-type-select');
    const icons = trigger.querySelectorAll('svg');
    expect(icons.length).toBe(2);
    expect(query(trigger, 'svg').getAttribute('class')).toContain('icon-tabler-code');
  });

  it('offers the Prettify button for a JSON body', () => {
    const root = renderSelector({ type: 'json', data: '{"a":1}' } as RequestBody);
    expect(getByTestId(root, 'body-prettify').text).toContain('Prettify');
  });

  it('offers the Prettify button for an XML body', () => {
    const root = renderSelector({ type: 'xml', data: '<a/>' } as RequestBody);
    expect(queryByTestId(root, 'body-prettify')).toBeTruthy();
  });

  it('hides the Prettify button for body types that cannot be tidied up', () => {
    expect(queryByTestId(renderSelector(undefined), 'body-prettify')).toBeNull();
    expect(queryByTestId(renderSelector({ type: 'text', data: 'hi' } as RequestBody), 'body-prettify')).toBeNull();
    expect(queryByTestId(renderSelector({ type: 'sparql', data: '{}' } as RequestBody), 'body-prettify')).toBeNull();
    expect(queryByTestId(renderSelector([] as RequestBody), 'body-prettify')).toBeNull();
    expect(
      queryByTestId(renderSelector({ type: 'multipart-form', data: [] } as RequestBody), 'body-prettify')
    ).toBeNull();
  });
});
