import styled from '@emotion/styled';

export const BodyActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  box-sizing: border-box;
  height: 1.53125rem;
  padding: 0.25rem;
  background: transparent;
  border: 0.0625rem solid var(--oc-border-border1);
  border-radius: var(--oc-border-radius-base);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
  color: var(--oc-colors-text-muted);
  cursor: pointer;
  user-select: none;

  &:hover {
    color: var(--oc-text);
  }

  &:focus-visible {
    outline: 0.125rem solid var(--oc-accents-primary);
    outline-offset: 0.0625rem;
  }

  .body-mode-caret {
    fill: currentColor;
  }
`;
