import styled from '@emotion/styled';

export const StyledWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--oc-font-size-sm);
  letter-spacing: 0.02em;

  &.method-badge--as-written {
    text-transform: none;
  }
`;
