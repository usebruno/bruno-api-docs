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

  @media (max-width: 1100px) {
    .code-samples-container {
      position: static;
    }
  }
`;

