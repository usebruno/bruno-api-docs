import styled from '@emotion/styled';

export const StyledWrapper = styled.h2`
  margin: 0 0 0.75rem 0;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--oc-font-size-sm);
  line-height: 1;
  text-transform: uppercase;
  color: var(--oc-text);

  &.section-label-lower {
    text-transform: none;
  }

  &.section-label-muted {
    color: var(--text-muted);
  }
`;
