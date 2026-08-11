import React from 'react';
import Tippy, { type TippyProps } from '@tippyjs/react';
import type { Instance } from 'tippy.js';
import { StyledWrapper } from './StyledWrapper';

export interface DropdownProps extends Omit<TippyProps, 'render' | 'children' | 'content' | 'ref'> {
  /** The trigger element (reference) the popover is anchored to. */
  icon: React.ReactElement;
  /** Popover content rendered inside the styled dropdown surface. */
  children: React.ReactNode;
  /** Mouse handlers applied to the popover surface (used for hover-driven submenus). */
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  /**
   * The popover width is set to the maximum of the content width and the trigger width,
   * it never renders narrower than the trigger, but still grows for wider content.
   */
  matchTriggerWidth?: boolean;
}

/**
 * Tippy-backed popover surface. Ported from bruno-app's `components/Dropdown`.
 * When `visible` is provided the popover is controlled; otherwise it toggles on
 * click. Rendering happens through Tippy's `render` prop so the surface is our
 * own `StyledWrapper` (no base Tippy CSS required).
 */
export const Dropdown: React.FC<DropdownProps> = ({
  icon,
  children,
  onCreate,
  placement,
  visible,
  appendTo,
  onMouseEnter,
  onMouseLeave,
  className,
  matchTriggerWidth,
  ...props
}) => {
  // Default to portaling the popover to <body> so it escapes any `overflow:
  // hidden`/clipping ancestor and z-index/stacking traps. This is safe because
  // the theme lives in `--oc-*` vars on :root, which cascade to body. Tippy's
  // `appendTo` is itself the portal — no separate createPortal is needed.
  const resolvedAppendTo = appendTo ?? (() => document.body);

  // Popper modifier that floors the popover's min-width at the trigger's width.
  // `effect` sets it before popper first measures the popover (so the initial
  // placement uses the widened box); `fn` keeps it in sync on later updates.
  const resolvedPopperOptions: TippyProps['popperOptions'] = matchTriggerWidth
    ? {
        ...props.popperOptions,
        modifiers: [
          ...(props.popperOptions?.modifiers ?? []),
          {
            name: 'matchTriggerWidth',
            enabled: true,
            phase: 'beforeWrite',
            requires: ['computeStyles'],
            fn: ({ state }) => {
              state.styles.popper.minWidth = `${state.rects.reference.width}px`;
            },
            effect: ({ state }) => {
              state.elements.popper.style.minWidth = `${(state.elements.reference as HTMLElement).offsetWidth}px`;
            }
          }
        ]
      }
    : props.popperOptions;

  // When controlled (visible provided) Tippy must not also manage a trigger.
  const tippyProps: Partial<TippyProps>
    = visible !== undefined
      ? { ...props, visible, interactive: true, appendTo: resolvedAppendTo, popperOptions: resolvedPopperOptions }
      : { ...props, trigger: 'click', interactive: true, appendTo: resolvedAppendTo, popperOptions: resolvedPopperOptions };

  return (
    <Tippy
      render={(attrs) => (
        <StyledWrapper
          className={`tippy-box dropdown${className ? ` ${className}` : ''}`}
          tabIndex={-1}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          {...attrs}
        >
          {children}
        </StyledWrapper>
      )}
      placement={placement ?? 'bottom-end'}
      animation={false}
      arrow={false}
      onCreate={onCreate as ((instance: Instance) => void) | undefined}
      {...tippyProps}
    >
      {icon}
    </Tippy>
  );
};

export default Dropdown;
