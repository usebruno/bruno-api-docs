import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  position: fixed;
  top: 5rem;
  right: 0;
  /* Floats above the page content, but deliberately below overlays, popovers, tooltips, the
     variable hover card (all --z-popover) and the playground backdrop (z 9998) so it never
     stands out over them. */
  z-index: calc(var(--z-overlay, 50) - 1);
  font-family: var(--font-sans);

  .section-nav-map {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    /* Height is capped (inline) to the docs area; clip so ticks never spill over the playground. */
    overflow: hidden;
  }
  .section-nav-tick-btn {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 1.35rem;
    padding: 0.125rem 0;
    background: none;
    border: none;
    cursor: pointer;
  }
  .section-nav-tick-btn:focus-visible {
    outline: 2px solid var(--oc-status-info-text);
    outline-offset: 2px;
    border-radius: 0.25rem;
  }
  .section-nav-tick {
    height: 0.15625rem;
    border-radius: 0.125rem;
    background: var(--border-strong);
    opacity: 0.6;
    transition: 150ms;
  }
  .section-nav-tick-btn:hover .section-nav-tick {
    opacity: 0.85;
  }
  .section-nav-tick.is-active {
    background: var(--oc-colors-text-yellow);
    opacity: 1;
  }

  .section-nav-panel {
    position: absolute;
    top: 0;
    right: calc(100% + 0.35rem);
    transform: translateX(0.5rem);
    min-width: 11rem;
    max-width: 17rem;
    max-height: calc(100vh - 7rem);
    overflow-y: auto;
    padding: 0.375rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
  }
  &.section-nav--open .section-nav-panel {
    opacity: 1;
    visibility: visible;
    transform: translateX(0);
  }

  .section-nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .section-nav-item {
    display: block;
    width: 100%;
    padding: 0.1875rem 0.5rem;
    background: none;
    border: none;
    border-radius: 0.3125rem;
    text-align: left;
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.15rem;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.12s ease, background 0.12s ease;
  }
  .section-nav-item-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .section-nav-item:hover,
  .section-nav-item.is-focused {
    background: color-mix(in srgb, var(--oc-colors-text-yellow) 15%, transparent);
    color: var(--text-primary);
  }
  .section-nav-item:focus-visible {
    outline: 2px solid var(--oc-status-info-text);
    outline-offset: -2px;
  }
  .section-nav-item.is-active,
  .section-nav-item.is-active:hover {
    color: var(--oc-colors-text-yellow);
  }

  /* The page-title row uses the primary golden accent and stays bold in every state (so activating
     it never changes its width). Other rows use the secondary text colour (see .section-nav-item),
     lifting to golden only when active. */
  .section-nav-item--title {
    color: var(--oc-colors-text-yellow);
    font-weight: 600;
  }

  @media (max-width: 48rem) {
    display: none;
  }
`;
