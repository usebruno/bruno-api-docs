import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .scripts-section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .scripts-card {
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--code-bg);
    border: 1px solid #ebeef1;
  }

  .scripts-card .tab-header {
    padding-inline: 16px;
    padding-top: 8px;
    background-color: #ebeef1;
  }

  .scripts-card .tab-header .tab-button {
    padding: 6px 0;
    border: none;
    border-bottom: 2px solid transparent;
    margin-right: 1.25rem;
    background: none;
    color: #687385;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: color 0.15s ease, border-color 0.15s ease;
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
    color: #30313d;
  }

  .scripts-card .tab-header .tab-button.active {
    color: #30313d !important;
    border-bottom-color: var(--primary-color) !important;
  }

  .scripts-card .tab-content {
    border-top: none;
    background-color: var(--code-bg);
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
    border-top: 1px solid #ebeef1;
  }

  .scripts-copy-button {
    position: absolute;
    top: 12px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 500;
    color: #687385;
    background-color: transparent;
    border: none;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: all 0.15s ease;
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
    background-color: rgba(0, 0, 0, 0.04);
    color: #30313d;
  }

  .scripts-copy-button.copied {
    color: #059669;
    background-color: rgba(5, 150, 105, 0.08);
  }

  .scripts-card .compact-code-view pre {
    margin: 0;
  }
`;
