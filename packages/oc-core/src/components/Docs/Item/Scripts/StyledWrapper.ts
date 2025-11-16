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
    border-bottom: 1px solid var(--border-color);
  }

  .scripts-card .tab-content {
    border-top: none;
    background-color: var(--background-color);
  }

  .scripts-card .compact-code-view {
    border: none;
    border-radius: 0;
    background-color: transparent;
  }

  .scripts-card .compact-code-view .code-header {
    display: flex;
    justify-content: flex-end;
    border: none;
    padding: 12px 16px;
    background-color: transparent;
  }

  .scripts-card .compact-code-view .code-header .section-title {
    display: none;
  }

  .scripts-card .compact-code-view .copy-button {
    margin-left: 0;
  }

  .scripts-card .compact-code-view .code-content {
    padding: 12px 16px;
    background-color: var(--code-bg);
    border-top: 1px solid var(--border-color);
  }

  .scripts-card .compact-code-view pre {
    margin: 0;
  }
`;

