import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  &.oc-playground {
    height: 100% !important;
    display: flex;
    flex-direction: column;
  }

  & > :last-child {
    flex: 1;
    min-height: 0;
  }

  .standalone-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 10px;
    border-bottom: 1px solid var(--oc-border-border0);
    background-color: var(--oc-background-base);
  }

  .standalone-toolbar .standalone-sidebar-toggle {
    color: var(--oc-colors-text-subtext0);
  }
`;
