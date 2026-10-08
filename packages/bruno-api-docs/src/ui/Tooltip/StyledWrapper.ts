import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  z-index: var(--z-popover, 1000);
  max-width: min(24rem, calc(100vw - 1rem));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--oc-border-border2);
  background: var(--oc-background-surface0);
  color: var(--oc-text);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  box-shadow: 0 2px 6px var(--oc-info-tip-box-shadow);
  pointer-events: none;

  &.oc-tooltip--multiline {
    white-space: pre-line;
  }
`;
