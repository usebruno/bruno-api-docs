import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDownIcon } from '@usebruno/api-shared/assets/icons';
import { useClickOutside } from '@usebruno/api-shared/hooks';
import { StyledWrapper } from './StyledWrapper';

interface DropdownProps {
  /** Trigger button text. */
  label: string;
  /** Highlights the trigger, e.g. when a value is selected. */
  active?: boolean;
  /** Accessible name for the listbox menu. */
  menuLabel: string;
  multiselect?: boolean;
  /** Menu content; receives `close` to dismiss after a selection. */
  children: (api: { close: () => void }) => React.ReactNode;
  testId?: string;
}

/**
 * Reusable trigger + popover menu. Owns the open state, close-on-outside-click
 * and Escape-to-close; consumers render the options via the `children`
 * render-prop and call `close` after a selection. Options should use the
 * `dropdown-option` / `dropdown-label` classes for consistent styling.
 */
export const Dropdown: React.FC<DropdownProps> = ({
  label,
  active = false,
  menuLabel,
  multiselect = false,
  children,
  testId
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(wrapperRef, close, open);

  // Escape closes just this menu (stopPropagation so it doesn't bubble to a
  // parent overlay such as the search palette).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <StyledWrapper ref={wrapperRef} data-testid={testId}>
      <button
        type="button"
        className={`dropdown-button${active ? ' is-active' : ''}`}
        data-testid={testId ? `${testId}-button` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((p) => !p)}
      >
        <span className="dropdown-trigger-label">{label}</span>
        <span className="dropdown-chevron">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <ul
          id={menuId}
          className="dropdown-menu"
          data-testid={testId ? `${testId}-menu` : undefined}
          role="listbox"
          aria-label={menuLabel}
          aria-multiselectable={multiselect || undefined}
        >
          {children({ close })}
        </ul>
      )}
    </StyledWrapper>
  );
};

export default Dropdown;
