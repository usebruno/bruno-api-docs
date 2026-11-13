import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: var(--oc-background-base);

  .search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    height: 1.75rem;
    margin: 0.75rem 0.75rem 0;
    padding: 0 0.5rem;
    border: 0.0625rem solid var(--oc-border-border0);
    border-radius: var(--oc-radius);
    background: var(--oc-background-mantle);
  }

  .search:focus-within {
    border-color: var(--oc-border-border1);
  }

  .search-icon,
  .search-clear {
    display: inline-flex;
    color: var(--oc-colors-text-subtext0);
  }

  .search-icon svg,
  .search-clear svg {
    width: 0.75rem;
    height: 0.75rem;
  }

  .search-clear {
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 0.75rem;
    color: var(--oc-text);
  }

  .search-input::placeholder {
    color: var(--oc-colors-text-subtext1);
  }

  .search-hl {
    font-weight: 700;
  }

  .search-empty {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
    color: var(--oc-colors-text-subtext1);
  }

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
