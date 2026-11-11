import React, { useEffect, useMemo } from 'react';
import type { Environment } from '@opencollection/types/config/environments';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectDocsCollection } from '@/store/slices/docs';
import { selectActiveEnvName, setActiveEnv, NO_ENVIRONMENT } from '@/store/slices/env';
import { IconSettings } from '@tabler/icons';
import { ChevronDownIcon } from '@/assets/icons';
import { EnvironmentLabel } from '../EnvironmentLabel/EnvironmentLabel';
import MenuDropdown, { type MenuDropdownItem } from '@/ui/MenuDropdown';
import { StyledWrapper } from './StyledWrapper';

const NO_ENVIRONMENT_LABEL = 'No Environment';
const NO_ENVIRONMENT_OPTION = { name: NO_ENVIRONMENT } as Environment;

const menuItemId = (environment: Environment) => environment.name || '~no-environment';

export interface EnvSwitcherProps {
  hideWhenEmpty?: boolean;
  onConfigure?: () => void;
  testId?: string;
}

/**
 * Environment switcher for the docs: lets the reader pick which environment's
 * values are shown, storing the choice in the env slice. Self-contained (no
 * layout assumptions) so it can sit in the topbar or elsewhere. The dot + name
 * reuse `EnvironmentLabel`. The menu renders through `MenuDropdown` (Tippy),
 * which portals to <body>, positions against the trigger, tracks scroll/resize,
 * and handles outside-click and Escape — so this component owns no positioning
 * or dismissal logic of its own. Tippy's `--z-popover` surface keeps the menu
 * above every playground dock.
 */
const EnvSwitcher: React.FC<EnvSwitcherProps> = ({
  hideWhenEmpty = false,
  onConfigure,
  testId = 'env-switcher'
}) => {
  const dispatch = useAppDispatch();
  const collection = useAppSelector(selectDocsCollection);
  const activeEnvName = useAppSelector(selectActiveEnvName);

  const environments = useMemo(
    () => (collection?.config?.environments ?? []) as Environment[],
    [collection]
  );
  const hasEnvironments = environments.length > 0;

  const options = useMemo(() => [NO_ENVIRONMENT_OPTION, ...environments], [environments]);

  // The active env, resolving a null or stale (no longer present) selection to
  // the first environment. Single source for both the render and the effect.
  const activeEnv
    = options.find((environment) => environment.name === activeEnvName) ?? environments[0] ?? NO_ENVIRONMENT_OPTION;

  // Sync the store when the stored name isn't the resolved one (null or stale),
  // so the persisted selection self-heals to a real environment.
  useEffect(() => {
    if (activeEnv.name && activeEnv.name !== activeEnvName) {
      dispatch(setActiveEnv(activeEnv.name));
    }
  }, [activeEnv, activeEnvName, dispatch]);

  if (hideWhenEmpty && !hasEnvironments) return null;

  const items: MenuDropdownItem[] = [
    ...options.map((environment) => ({
      id: menuItemId(environment),
      label: environment.name ? (
        <EnvironmentLabel
          name={environment.name}
          color={environment.color}
          nameClassName="environment-label-name--clamped"
        />
      ) : (
        NO_ENVIRONMENT_LABEL
      ),
      ariaLabel: environment.name || undefined,
      title: environment.name || undefined,
      className: environment.name ? undefined : 'dropdown-item-muted',
      onClick: () => dispatch(setActiveEnv(environment.name))
    })),
    ...(onConfigure
      ? [
          { type: 'divider' as const, id: '~configure-divider' },
          {
            id: '~configure',
            label: 'Configure',
            leftSection: IconSettings,
            className: 'dropdown-item-centered',
            onClick: onConfigure
          }
        ]
      : [])
  ];

  return (
    <StyledWrapper data-testid={`${testId}-root`}>
      <MenuDropdown
        items={items}
        selectedItemId={menuItemId(activeEnv)}
        showTickMark={false}
        placement="bottom-end"
        matchTriggerWidth
        testId={testId}
      >
        <button
          type="button"
          className={activeEnv.name ? 'env-switcher-trigger' : 'env-switcher-trigger env-switcher-trigger--none'}
          aria-haspopup="menu"
          aria-label="Select environment"
        >
          <EnvironmentLabel name={activeEnv.name || NO_ENVIRONMENT_LABEL} color={activeEnv.color} truncate />
          <span className="env-switcher-chevron">
            <ChevronDownIcon />
          </span>
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default EnvSwitcher;
