import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { describe, it, expect } from 'vitest';
import type { OpenCollection } from '@opencollection/types';
import type { Environment } from '@opencollection/types/config/environments';
import { TestProviders } from '../../test-utils/providers';
import { createSession, type Session } from '../../session/session';
import { getByTestId, queryByTestId } from '../../test-utils/dom';
import { NO_ENVIRONMENT } from '../../session/env';
import EnvSwitcher, { type EnvSwitcherProps } from './EnvSwitcher';

const collectionWith = (environments: Environment[]): OpenCollection => ({ config: { environments } });

const withEnvs = collectionWith([{ name: 'Dev' }, { name: 'Prod' }]);

const render = (
  collection: OpenCollection,
  configure?: (s: Session) => void,
  props?: Partial<EnvSwitcherProps>
) => {
  const session = createSession();
  configure?.(session);
  const root = parse(
    renderToStaticMarkup(
      <TestProviders document={collection} session={session}>
        <EnvSwitcher {...props} />
      </TestProviders>
    )
  );
  root.querySelectorAll('style').forEach((style) => style.remove());
  return root;
};

describe('EnvSwitcher', () => {
  it('shows the active environment name in the trigger', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.env.setActiveEnv('Prod')), 'env-switcher');
    expect(trigger.text).toContain('Prod');
  });

  it('marks the trigger as an accessible menu button', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.env.setActiveEnv('Prod')), 'env-switcher');
    expect(trigger.getAttribute('aria-label')).toBe('Select environment');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('type')).toBe('button');
  });

  it('renders the trigger closed with no menu in the static markup', () => {
    const root = render(withEnvs, (s) => s.env.setActiveEnv('Prod'));
    expect(getByTestId(root, 'env-switcher').getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[role="menu"]')).toBeNull();
  });

  it('falls back to the first env when none is active yet', () => {
    expect(getByTestId(render(withEnvs), 'env-switcher').text).toContain('Dev');
  });

  it('resolves a stale stored env to the first env in the render', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.env.setActiveEnv('Ghost')), 'env-switcher');
    expect(trigger.text).toContain('Dev');
    expect(trigger.text).not.toContain('Ghost');
  });

  it('still opens a menu showing "No Environment" when there are no environments', () => {
    const root = render(collectionWith([]));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.text).toContain('No Environment');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(root.querySelector('.env-switcher-chevron')).toBeTruthy();
  });

  it('keeps the caret and the menu affordance when there are environments', () => {
    const root = render(withEnvs, (s) => s.env.setActiveEnv('Dev'));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-disabled')).toBeFalsy();
    expect(root.querySelector('.env-switcher-chevron')).toBeTruthy();
  });

  it('paints the trigger dot with the active env color', () => {
    const dot = getByTestId(
      render(collectionWith([{ name: 'Dev', color: 'rgb(255, 0, 0)' }]), (s) => s.env.setActiveEnv('Dev')),
      'env-switcher'
    ).querySelector('.environment-label-dot');
    expect(dot?.getAttribute('style')).toContain('rgb(255, 0, 0)');
    expect(dot?.classList.contains('environment-label-dot--empty')).toBe(false);
  });

  it('renders the full env name in the trigger, clamped for the tooltip to reveal', () => {
    const long = 'development-staging-area-testing-qa-automation-local-setup-1';
    const root = render(collectionWith([{ name: long }]), (s) => s.env.setActiveEnv(long));
    const trigger = getByTestId(root, 'env-switcher');
    expect(trigger.text).toContain(long);
    expect(getByTestId(root, 'truncated-text').classList.contains('environment-label-name--clamped')).toBe(true);
  });

  it('derives the root and trigger test ids from a custom testId', () => {
    const root = render(withEnvs, (s) => s.env.setActiveEnv('Dev'), { testId: 'playground-env-switcher' });
    expect(getByTestId(root, 'playground-env-switcher-root')).toBeTruthy();
    expect(getByTestId(root, 'playground-env-switcher')).toBeTruthy();
  });
});

describe('EnvSwitcher lists the environments of the loaded document', () => {
  it('shows an environment the document has', () => {
    const trigger = getByTestId(
      render(collectionWith([{ name: 'Dev' }, { name: 'Prod' }, { name: 'Added' }]), (s) => s.env.setActiveEnv('Added')),
      'env-switcher'
    );
    expect(trigger.text).toBe('Added');
  });

  it('falls back to the document\'s first env when the active env is not in it', () => {
    const trigger = getByTestId(
      render(collectionWith([{ name: 'Staging' }]), (s) => s.env.setActiveEnv('Prod')),
      'env-switcher'
    );
    expect(trigger.text).toBe('Staging');
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
});

describe('EnvSwitcher No Environment', () => {
  it('keeps "No Environment" instead of falling back to the first environment', () => {
    const trigger = getByTestId(render(withEnvs, (s) => s.env.setActiveEnv(NO_ENVIRONMENT)), 'env-switcher');
    expect(trigger.text).toContain('No Environment');
    expect(trigger.text).not.toContain('Dev');
  });
});

describe('EnvSwitcher name truncation', () => {
  it('drops the native title in favour of the styled tooltip anchor', () => {
    const root = render(withEnvs, (s) => s.env.setActiveEnv('Dev'));
    expect(getByTestId(root, 'env-switcher').getAttribute('title')).toBeFalsy();
    expect(queryByTestId(root, 'truncated-text')).toBeTruthy();
  });
});
