import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;

  .tag-chip {
    display: inline-flex;
    align-items: flex-start;
    gap: 0.25rem;
    max-width: 100%;
    padding: 0.3125rem 0.375rem;
    box-sizing: border-box;
    border: 1px solid var(--oc-border-border0);
    border-radius: var(--oc-radius);
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-md);
    color: var(--oc-colors-text-subtext2);
  }

  .tag-chip.is-inherited {
    border-style: dashed;
    color: var(--oc-colors-text-subtext0);
  }

  .tag-chip svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: var(--oc-colors-text-subtext0);
  }

  .tag-chip-label {
    min-width: 0;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }
`;
