import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;

  .appshell-row {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .appshell-sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
    border-right: 1px solid var(--oc-border-border1, var(--border-color));
    background-color: var(--oc-sidebar-bg);
  }

  .appshell-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  @media (max-width: 768px) {
    .appshell-sidebar {
      display: none;
    }
  }
`;
