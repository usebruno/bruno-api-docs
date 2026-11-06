import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--oc-background-base);

  .tree {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
  }

  &.mobile .navlink-main {
    font-size: 0.75rem;
  }

  .tree::-webkit-scrollbar {
    width: 0.375rem;
  }
  .tree::-webkit-scrollbar-track {
    background: transparent;
    border: none;
  }
  .tree::-webkit-scrollbar-thumb {
    background-color: transparent;
    border: none;
    border-radius: 1.25rem;
    transition: background-color 0.4s ease;
  }
  .tree.scrolling::-webkit-scrollbar-thumb {
    background-color: var(--oc-scrollbar-color);
  }
`;
