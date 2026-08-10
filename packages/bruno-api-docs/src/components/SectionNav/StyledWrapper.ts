import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  position: fixed;
  top: 13rem;
  right: 0;
  z-index: calc(var(--z-overlay, 50) - 1);
  font-family: var(--font-sans);

  .section-nav-map {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    margin-right: 0.5rem;
    padding: 0.25rem 0.5rem;
    overflow: hidden;
    border: 1px solid transparent;
    border-radius: var(--oc-radius);
  }

  .section-nav-item {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0.1875rem 0.25rem;
    background: none;
    border: none;
    border-radius: 0.3125rem;
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.15rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.12s ease, background 0.12s ease;
  }
  .section-nav-item:focus-visible {
    outline: 2px solid var(--oc-status-info-text);
    outline-offset: -2px;
  }

  .section-nav-item-text {
    max-width: 0;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    text-align: left;
    white-space: nowrap;
  }

  .section-nav-tick-slot {
    flex: none;
    display: flex;
    justify-content: flex-end;
    width: 1.35rem;
  }
  .section-nav-tick {
    height: 0.15625rem;
    border-radius: 0.125rem;
    background: var(--border-strong);
    opacity: 0.6;
    transition: opacity 0.15s ease;
  }
  .section-nav-item:hover .section-nav-tick {
    opacity: 0.85;
  }
  .section-nav-item.is-active .section-nav-tick {
    background: var(--oc-colors-accent);
    opacity: 1;
  }
  .section-nav-item.is-active {
    color: var(--oc-colors-accent);
  }

  &.section-nav--open .section-nav-map {
    align-items: stretch;
    gap: 0.125rem;
    min-width: 11rem;
    max-width: 17rem;
    padding: 0.5rem;
    background: var(--bg-primary);
    border-color: var(--border-color);
    overflow-y: auto;
    animation: sectionNavOpen 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @keyframes sectionNavOpen {
    from {
      opacity: 0;
      transform: translateX(1.25rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  &.section-nav--open .section-nav-item {
    justify-content: flex-start;
    padding-left: var(--nav-indent, 0.5rem);
  }
  &.section-nav--open .section-nav-item-text {
    max-width: 16rem;
    max-height: 6rem;
    opacity: 1;
    white-space: normal;
    overflow-wrap: break-word;
  }
  &.section-nav--open .section-nav-tick-slot {
    display: none;
  }
  &.section-nav--open .section-nav-item:hover,
  &.section-nav--open .section-nav-item.is-focused {
    background: color-mix(in srgb, var(--oc-text) 4%, transparent);
    color: var(--text-primary);
  }
  &.section-nav--open .section-nav-item.is-active {
    background: color-mix(in srgb, var(--oc-colors-accent) 8%, transparent);
  }
  &.section-nav--open .section-nav-item.is-active:hover {
    background: color-mix(in srgb, var(--oc-colors-accent) 12%, transparent);
  }

  .section-nav-item--title .section-nav-item-text {
    color: var(--text-primary);
    font-weight: 600;
  }
  .section-nav-item--title.is-active .section-nav-item-text {
    color: var(--oc-colors-accent);
  }

  @media (max-width: 48rem) {
    display: none;
  }
`;
