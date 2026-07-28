import React from 'react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import { createOpenCollectionStore } from '../../store/store';
import { setDocsCollection } from '../../store/slices/docs';
import { setActiveEnv } from '../../store/slices/env';
import { VariableResolverProvider } from '../../hooks';
import { useRenderToDom } from '../../hooks/useRenderToDom';
import { query } from '../../test-utils/dom';
import { VariableInfoCard } from './VariableInfoCard';

const collection: any = {
  request: {
    variables: [
      { name: 'apiVersion', value: '2024-01' },
      { name: 'profile', value: { type: 'object', data: { city: 'NYC', zip: 10001 } } }
    ]
  },
  config: {
    environments: [
      {
        name: 'Dev',
        variables: [
          { name: 'host', value: 'https://dev.test' },
          { name: 'endpoint', value: '{{host}}/v1' },
          { name: 'bearer_token', value: 'super-secret', secret: true },
          { name: 'emptyValue', value: '' }
        ]
      }
    ]
  }
};

const cardTree = (name: string) => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  store.dispatch(setActiveEnv('Dev'));
  return (
    <Provider store={store}>
      <VariableResolverProvider>
        <VariableInfoCard name={name} />
      </VariableResolverProvider>
    </Provider>
  );
};

const selector = (suffix: string) => `[data-testid="variable-info-card-${suffix}"]`;

const part = (root: ReturnType<typeof useRenderToDom>, suffix: string) =>
  query(root, selector(suffix));

describe('VariableInfoCard', () => {
  it('shows name + scope badge + resolved value for an environment variable', () => {
    const root = useRenderToDom(cardTree('host'));
    expect(part(root, 'name').text).toBe('host');
    expect(part(root, 'scope').text).toBe('Environment');
    expect(part(root, 'value').text).toBe('https://dev.test');
  });

  it('labels a collection variable and resolves references recursively', () => {
    expect(part(useRenderToDom(cardTree('apiVersion')), 'scope').text).toBe('Collection');
    expect(part(useRenderToDom(cardTree('endpoint')), 'value').text).toBe('https://dev.test/v1');
  });

  it('shows a (Secret) placeholder with no reveal/copy and never prints the plaintext', () => {
    const root = useRenderToDom(cardTree('bearer_token'));
    expect(part(root, 'value').text).toBe('(Secret)');
    expect(root.toString()).not.toContain('super-secret');
    expect(root.querySelector(selector('reveal'))).toBeNull();
    expect(root.querySelector(selector('copy'))).toBeNull();
  });

  it('shows an (empty) placeholder with no copy control when the value is blank', () => {
    const root = useRenderToDom(cardTree('emptyValue'));
    expect(part(root, 'scope').text).toBe('Environment');
    expect(part(root, 'value').text).toBe('(empty)');
    expect(root.querySelector(selector('copy'))).toBeNull();
  });

  it('pretty-prints an object-typed value', () => {
    const value = part(useRenderToDom(cardTree('profile')), 'value').text;
    expect(JSON.parse(value)).toEqual({ city: 'NYC', zip: 10001 });
    expect(value).toContain('\n');
  });

  it('warns on an invalid variable name and shows no value', () => {
    const root = useRenderToDom(cardTree('bad name'));
    expect(root.querySelector(selector('warning'))).not.toBeNull();
    expect(root.querySelector(selector('value'))).toBeNull();
  });

  it('marks process.env as read-only', () => {
    const root = useRenderToDom(cardTree('process.env.HOME'));
    expect(part(root, 'scope').text).toBe('Process Env');
    expect(part(root, 'note').text).toBe('read-only');
  });

  it('notes a dynamic variable and shows no value', () => {
    const root = useRenderToDom(cardTree('$randomInt'));
    expect(part(root, 'scope').text).toBe('Dynamic');
    expect(part(root, 'note').text).toContain('random value');
    expect(root.querySelector(selector('value'))).toBeNull();
  });

  it('notes a time-based dynamic variable with the timestamp wording', () => {
    const root = useRenderToDom(cardTree('$timestamp'));
    expect(part(root, 'scope').text).toBe('Dynamic');
    expect(part(root, 'note').text).toContain('current timestamp');
  });

  it('warns on an unknown dynamic ($) function name', () => {
    const root = useRenderToDom(cardTree('$notAFunc'));
    expect(part(root, 'scope').text).toBe('Dynamic');
    expect(part(root, 'warning').text).toContain('Unknown dynamic variable');
    expect(root.querySelector(selector('note'))).toBeNull();
  });

  it('reports an undefined variable with a note', () => {
    const root = useRenderToDom(cardTree('nope'));
    expect(part(root, 'scope').text).toBe('Undefined');
    expect(part(root, 'note').text).toBe('Variable is not defined');
  });
});

const editableCardTree = (name: string) => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  store.dispatch(setActiveEnv('Dev'));
  return (
    <Provider store={store}>
      <VariableResolverProvider>
        <VariableInfoCard name={name} editable />
      </VariableResolverProvider>
    </Provider>
  );
};

describe('VariableInfoCard (editable)', () => {
  it('renders an editable value for an environment variable', () => {
    const value = part(useRenderToDom(editableCardTree('host')), 'value');
    expect(value.getAttribute('role')).toBe('button');
    expect(value.classList.contains('var-value-editable')).toBe(true);
  });

  it('renders an editable value for a collection variable', () => {
    const value = part(useRenderToDom(editableCardTree('apiVersion')), 'value');
    expect(value.classList.contains('var-value-editable')).toBe(true);
  });

  it('stays read-only by default (docs surfaces do not pass editable)', () => {
    const value = part(useRenderToDom(cardTree('host')), 'value');
    expect(value.classList.contains('var-value-editable')).toBe(false);
    expect(value.getAttribute('role')).toBeFalsy();
  });

  it('never makes a secret variable editable', () => {
    const value = part(useRenderToDom(editableCardTree('bearer_token')), 'value');
    expect(value.text).toBe('(Secret)');
    expect(value.classList.contains('var-value-editable')).toBe(false);
  });

  it('never makes a read-only scope (process.env) editable', () => {
    const root = useRenderToDom(editableCardTree('process.env.HOME'));
    expect(part(root, 'note').text).toBe('read-only');
    expect(part(root, 'value').classList.contains('var-value-editable')).toBe(false);
  });
});
