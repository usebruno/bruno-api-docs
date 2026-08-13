import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .snippet-box {
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    overflow: hidden;
    background: var(--oc-background-base);
  }

  .snippet-head {
    display: flex;
    align-items: stretch;
    min-height: 2.375rem;
    padding: 0 0.375rem;
    border-bottom: 1px solid var(--border-color);
  }

  .snippet-tabs {
    display: flex;
    align-items: stretch;
  }

  .snippet-tab {
    display: inline-flex;
    align-items: center;
    padding: 0 0.625rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.12s ease;
  }
  .snippet-tab:hover {
    color: var(--text-primary);
  }
  .snippet-tab.is-active {
    color: var(--text-primary);
    font-weight: 600;
    border-bottom-color: var(--primary-color);
  }
  .snippet-tab:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .snippet-head-spacer {
    flex: 1;
  }

  .snippet-box .code-content-wrapper {
    border: none;
    border-radius: 0;
  }

  && .code-copy-floating {
    opacity: 1;
  }

  .code-snippet-expand {
    align-self: center;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border: none;
    background: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--oc-radius);
    transition: color 0.12s ease;
  }
  .code-snippet-expand:hover {
    color: var(--text-primary);
  }
  .code-snippet-expand:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .snippet-box .code-content-numbered,
  .snippet-box .code-content:not(.code-content--numbered) {
    max-height: calc(100vh - 12rem);
    overflow-y: auto;
  }

  .snippet-box .code-content-numbered {
    align-items: flex-start;
  }

  &.is-modal .snippet-box .code-content-numbered,
  &.is-modal .snippet-box .code-content:not(.code-content--numbered) {
    max-height: none;
  }

  .snippet-copy {
    align-self: center;
    flex: 0 0 auto;
  }

  .snippet-trigger {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.5rem;
    font-family: var(--font-sans);
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    color: var(--text-tertiary);
    background-color: var(--oc-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    cursor: pointer;
    transition:
      color 0.15s ease,
      background-color 0.15s ease;
  }
  .snippet-trigger:hover {
    color: var(--text-secondary);
    background-color: var(--badge-bg);
  }

  .snippet-trigger:focus-visible {
    outline: none;
  }
`;
