import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .code-example-section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .code-example-card {
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--code-bg);
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

  .tab-header {
    padding-inline: 16px;
    padding-top: 8px;
    background-color: #ebeef1;

    .tab-button {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 1.25rem;
      margin-left: 0;
      color: #687385;
      cursor: pointer;
      background: none;
      font-size: 0.75rem;
      font-weight: 500;
      transition: color 0.15s ease, border-color 0.15s ease;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: #30313d;
      }

      &.active {
        color: #30313d !important;
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
    border-top: 1px solid #ebeef1;
  }

  .code-example-code-wrapper .compact-code-view pre {
    margin: 0;
  }

  @media (max-width: 1100px) {
    .code-samples-container {
      position: static;
    }
  }

  .code-content-wrapper {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;
