import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;

  &.is-open {
    grid-template-rows: 1fr;
  }

  .collapse-clip {
    overflow: hidden;
    min-height: 0;
    visibility: hidden;
    transition: visibility 0s linear 0.25s;
  }

  &.is-open .collapse-clip {
    visibility: visible;
    transition: visibility 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    .collapse-clip {
      transition: none;
    }
  }
`;
