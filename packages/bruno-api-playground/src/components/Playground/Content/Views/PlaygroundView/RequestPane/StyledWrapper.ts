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

  .description,
  .asserts-description {
    font-size: var(--oc-font-size-base);
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0;
    color: var(--text-muted);
  }
`;
