import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .scripts-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .scripts-card {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--background-color);
  }

  .scripts-card .tab-header {
    padding-inline: 16px;
    padding-top: 6px;
  }

  .scripts-card .tab-header .tab-button {
    padding: 6px 0;
    border: none;
    border-bottom: 2px solid transparent;
    margin-right: 1.25rem;
    background: none;
    color: var(--oc-tabs-color);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  .scripts-card .tab-header .tab-button:focus,
  .scripts-card .tab-header .tab-button:active,
  .scripts-card .tab-header .tab-button:focus-within,
  .scripts-card .tab-header .tab-button:focus-visible,
  .scripts-card .tab-header .tab-button:target {
    outline: none;
    box-shadow: none;
  }

  .scripts-card .tab-header .tab-button:hover {
    color: var(--oc-tabs-active-color);
  }

  .scripts-card .tab-header .tab-button.active {
    color: var(--oc-tabs-active-color) !important;
    border-bottom-color: var(--primary-color) !important;
  }

  .scripts-card .tab-content {
    border-top: none;
    background-color: var(--background-color);
  }

  .scripts-code-wrapper {
    position: relative;
  }

  .scripts-code-wrapper .compact-code-view {
    border: none;
    border-radius: 0;
    background-color: transparent;
  }

  .scripts-code-wrapper .compact-code-view .code-content {
    padding: 32px 16px 16px;
    background-color: var(--code-bg);
    border-top: 1px solid var(--border-color);
  }

  .scripts-copy-button {
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

  .scripts-code-wrapper:hover .scripts-copy-button,
  .scripts-copy-button:focus,
  .scripts-copy-button:focus-visible,
  .scripts-copy-button.copied {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .scripts-copy-button:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: var(--text-primary);
  }

  .scripts-copy-button.copied {
    color: #15803d;
    background-color: rgba(34, 197, 94, 0.15);
  }

  .dark & .scripts-copy-button {
    background-color: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
  }

  .dark & .scripts-copy-button:hover {
    background-color: rgba(255, 255, 255, 0.12);
    color: var(--text-primary);
  }

  .dark & .scripts-copy-button.copied {
    color: #4ade80;
    background-color: rgba(34, 197, 94, 0.2);
  }

  .dark & .scripts-copy-button.copied:hover {
    background-color: rgba(34, 197, 94, 0.3);
    color: #bbf7d0;
  }


  .scripts-card .compact-code-view pre {
    margin: 0;
  }
`;

