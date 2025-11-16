import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .code-example-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .code-example-card {
    border-radius: 8px;
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .code-example-card .compact-code-view {
    border: none;
    border-radius: 0;
  }

  .code-samples {
    width: 100%;
    min-width: 30%;
  }

  .code-samples-frame {
    width: 100%;
    min-width: 30%;
    height: fit-content;
  }

  .code-samples-container {
    width: 100%;
    overflow-x: auto;
  }

  /* Tab styling based on reference design */
  .tab-header {
    border-bottom: 1px solid var(--border-color);
    padding-inline: 16px;
    padding-top: 6px;
    
    .tab-button {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 1.25rem;
      margin-left: 0;
      color: var(--oc-tabs-color);
      cursor: pointer;
      background: none;
      font-size: 0.75rem;
      font-weight: 500;
      transition: color 0.2s ease, border-color 0.2s ease;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: var(--oc-tabs-active-color);
      }

      &.active {
        color: var(--oc-tabs-active-color) !important;
        border-bottom: solid 2px var(--primary-color) !important;
      }
    }
  }

  .code-example-code-wrapper {
    position: relative;
  }

  .code-example-code-wrapper .compact-code-view {
    border: none;
    border-radius: 0;
    background-color: transparent;
  }

  .code-example-code-wrapper .compact-code-view .code-content {
    padding: 32px 16px 16px;
    background-color: var(--code-bg);
    border-top: 1px solid var(--border-color);
  }

  .code-example-code-wrapper .compact-code-view pre {
    margin: 0;
  }

  .code-copy-button {
    position: absolute;
    top: 12px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-secondary);
    background-color: rgba(0, 0, 0, 0.04);
    border: none;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
  }

  .code-example-code-wrapper:hover .code-copy-button,
  .code-copy-button:focus,
  .code-copy-button:focus-visible,
  .code-copy-button.copied {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .code-copy-button:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: var(--text-primary);
  }

  .code-copy-button.copied {
    color: #15803d;
    background-color: rgba(34, 197, 94, 0.15);
  }

  .dark & .code-copy-button {
    background-color: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
  }

  .dark & .code-copy-button:hover {
    background-color: rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
  }

  .dark & .code-copy-button.copied {
    color: #4ade80;
    background-color: rgba(34, 197, 94, 0.2);
  }

  .dark & .code-copy-button.copied:hover {
    background-color: rgba(34, 197, 94, 0.3);
    color: #bbf7d0;
  }

  @media (max-width: 1100px) {
    .code-samples-container {
      position: static;
    }
  }
`;

