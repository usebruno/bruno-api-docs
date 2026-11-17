import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  background-color: var(--bg-primary);

  .oc-tabs {
    height: 100%;
  }

  .oc-tabs .tab-panel {
    min-height: 0;
    overflow-y: auto;
  }

  .tabs-right .oc-select {
    box-sizing: border-box;
    height: 1.53125rem;
    padding: 0.25rem 0.375rem;
    color: var(--oc-colors-text-muted);
    background: transparent;
    border: 0.0625rem solid var(--oc-border-border1);
    border-radius: var(--oc-border-radius-base);
  }

  .tabs-right .oc-select:hover {
    color: var(--oc-text);
  }

  .tabs-right .oc-select .oc-select-label {
    font-weight: 500;
  }

  .description,
  .asserts-description {
    font-size: 0.8125rem;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0;
    color: var(--text-muted);
  }
`;
