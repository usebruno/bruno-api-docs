import styled from '@emotion/styled';

export const StyledWrapper = styled.h1`
  margin: 0;
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--text-primary);

  &.heading--lg {
    font-size: var(--oc-font-size-xxl);
    line-height: 1;
    letter-spacing: -0.5px;
  }

  &.heading--md {
    font-size: var(--oc-font-size-lg);
    letter-spacing: 0;
  }
`;
