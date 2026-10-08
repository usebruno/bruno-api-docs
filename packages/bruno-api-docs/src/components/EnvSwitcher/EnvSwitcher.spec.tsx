import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import { createOpenCollectionStore } from '@/store/store';
import { setDocsCollection } from '@/store/slices/docs';
import { setActiveEnv } from '@/store/slices/env';
import { getByTestId, queryByTestId } from '@/test-utils/dom';
import EnvSwitcher, { type EnvSwitcherProps } from './EnvSwitcher';

const collectionWith = (environments: Environment[]): OpenCollection => ({ config: { environments } });

const withEnvs = collectionWith([{ name: 'Dev' }, { name: 'Prod' }]);

const render = (
  collection: OpenCollection,
  configure?: (s: ReturnType<typeof createOpenCollectionStore>) => void,
  props?: Partial<EnvSwitcherProps>
) => {
  const store = createOpenCollectionStore();
  store.dispatch(setDocsCollection(collection));
  configure?.(store);
  const root = parse(
    renderToStaticMarkup(
      <Provider store={store}>
        <EnvSwitcher {...props} />
      </Provider>
    )
  );
  root.querySelectorAll('style').forEach((style) => style.remove());
  return root;
};

describe('EnvSwitcher', () => {
  it('shows the active environment name in the trigger', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.dispatch(setActiveEnv('Prod'))), 'env-switcher');
    expect(trigger.text).toContain('Prod');
  });

  it('marks the trigger as an accessible menu button', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.dispatch(setActiveEnv('Prod'))), 'env-switcher');
    expect(trigger.getAttribute('aria-label')).toBe('Select environment');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('type')).toBe('button');
  });

  it('renders the trigger closed with no menu in the static markup', () => {
    const root = render(withEnvs, (s) => s.dispatch(setActiveEnv('Prod')));
    expect(getByTestId(root, 'env-switcher').getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[role="menu"]')).toBeNull();
  });

  it('falls back to the first env when none is active yet', () => {
    expect(getByTestId(render(withEnvs), 'env-switcher').text).toContain('Dev');
  });

  it('resolves a stale stored env to the first env in the render', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.dispatch(setActiveEnv('Ghost'))), 'env-switcher');
    expect(trigger.text).toContain('Dev');
    expect(trigger.text).not.toContain('Ghost');
  });

  it('renders the empty state as plain text, not a button, when there are no environments', () => {
    const root = render(collectionWith([]));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.text).toContain('No environments');
    expect(trigger.tagName.toLowerCase()).toBe('span');
    expect(trigger.classList.contains('env-switcher-trigger--empty')).toBe(true);
    expect(trigger.getAttribute('title')).toBeFalsy();
    expect(trigger.getAttribute('aria-label')).toBeFalsy();
    expect(trigger.getAttribute('aria-haspopup')).toBeFalsy();
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('.env-switcher-chevron')).toBeFalsy();
  });

  it('keeps the caret and the menu affordance when there are environments', () => {
    const root = render(withEnvs, (s) => s.dispatch(setActiveEnv('Dev')));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-disabled')).toBeFalsy();
    expect(root.querySelector('.env-switcher-chevron')).toBeTruthy();
  });

  it('carries the empty modifier only when there are no environments', () => {
    const trigger = getByTestId(render(withEnvs), 'env-switcher');
    expect(trigger.classList.contains('env-switcher-trigger--empty')).toBe(false);
  });

  it('paints the trigger dot with the active env color', () => {
    const dot = getByTestId(
      render(collectionWith([{ name: 'Dev', color: '#ff0000' }]), (s) => s.dispatch(setActiveEnv('Dev'))),
      'env-switcher'
    ).querySelector('.environment-label-dot');
    expect(dot?.getAttribute('style')).toContain('#ff0000');
    expect(dot?.classList.contains('environment-label-dot--empty')).toBe(false);
  });

  it('renders the full env name in the trigger, clamped for the tooltip to reveal', () => {
    const long = 'development-staging-area-testing-qa-automation-local-setup-1';
    const root = render(collectionWith([{ name: long }]), (s) => s.dispatch(setActiveEnv(long)));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.text).toContain(long);
    expect(getByTestId(root, 'truncated-text').classList.contains('environment-label-name--clamped')).toBe(true);
  });

  it('derives the root and trigger test ids from a custom testId', () => {
    const root = render(withEnvs, (s) => s.dispatch(setActiveEnv('Dev')), { testId: 'playground-env-switcher' });
    expect(getByTestId(root, 'playground-env-switcher-root')).toBeTruthy();
    expect(getByTestId(root, 'playground-env-switcher')).toBeTruthy();
  });
});

describe('EnvSwitcher hideWhenEmpty', () => {
  it('renders nothing when the collection has no environments', () => {
    const root = render(collectionWith([]), undefined, { hideWhenEmpty: true });
    expect(queryByTestId(root, 'env-switcher-root')).toBeNull();
  });

  it('still renders the switcher when the collection has environments', () => {
    const root = render(withEnvs, undefined, { hideWhenEmpty: true });
    expect(getByTestId(root, 'env-switcher').text).toContain('Dev');
  });

  it('keeps the empty state by default, for the playground sidebar', () => {
    const trigger = getByTestId(render(collectionWith([])), 'env-switcher');
    expect(trigger.text).toContain('No environments');
  });
});

describe('EnvSwitcher name truncation', () => {
  it('drops the native title in favour of the styled tooltip anchor', () => {
    const root = render(withEnvs, (s) => s.dispatch(setActiveEnv('Dev')));
    expect(getByTestId(root, 'env-switcher').getAttribute('title')).toBeFalsy();
    expect(queryByTestId(root, 'truncated-text')).toBeTruthy();
  });
});
