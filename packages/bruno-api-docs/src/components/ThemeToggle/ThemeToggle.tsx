import React from 'react';
import styled from '@emotion/styled';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setThemeMode } from '@/store/slices/theme';
import { selectTheme } from '@/store/slices/theme';
import { Tooltip } from '@/ui/Tooltip/Tooltip';
import { isDarkMode } from '@/utils/theme';

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  background: transparent;
  color: var(--oc-colors-text-muted, var(--oc-text));
  border: 0.0625rem solid var(--oc-border-border1);
  border-radius: var(--oc-radius);
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  &:hover {
    background: var(--oc-sidebar-collection-item-hover-bg, var(--oc-background-surface0));
    color: var(--oc-text);
  }
`;

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const ThemeToggle: React.FC<{ testId?: string }> = ({ testId = 'theme-toggle' }) => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector(selectTheme);
  const label = isDarkMode(mode) ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Tooltip content={label} touch={false} testId={`${testId}-tooltip`}>
      {isDarkMode(mode) ? (
        <Button data-testid={testId} aria-label="Switch to light theme" onClick={() => dispatch(setThemeMode('light'))}>
          <SunIcon />
      </Button>
      ) : (
        <Button data-testid={testId} aria-label="Switch to dark theme" onClick={() => dispatch(setThemeMode('dark'))}>
          <MoonIcon />
        </Button>
      )}
    </Tooltip>
  );
};

export default ThemeToggle;
