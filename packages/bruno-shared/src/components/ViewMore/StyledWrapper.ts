import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .view-more-content {
    overflow: hidden;
  }

  &:not(.is-expanded) .view-more-content {
    max-height: var(--view-more-collapsed);
  }

  &.is-overflowing:not(.is-expanded) .view-more-content {
    -webkit-mask-image: linear-gradient(to bottom, var(--oc-examples-button-icon-color) 82%, transparent);
    mask-image: linear-gradient(to bottom, var(--oc-examples-button-icon-color) 82%, transparent);
  }

  &.is-animating .view-more-content {
    transition: max-height 0.26s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: max-height;
  }

  @media (prefers-reduced-motion: reduce) {
    &.is-animating .view-more-content {
      transition: none;
    }
  }

  .view-more-toggle {
    margin-top: 0.75rem;
    letter-spacing: 0;
    color: var(--primary-text);
  }
`;
