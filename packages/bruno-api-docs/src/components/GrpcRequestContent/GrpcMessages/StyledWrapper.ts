import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .grpc-messages-show-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.75rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 0.8125rem;
    line-height: 1;
    letter-spacing: 0;
    color: var(--primary-text);
  }
  .grpc-messages-show-toggle:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .grpc-messages-show-chevron {
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }
  .grpc-messages-show-toggle[aria-expanded='true'] .grpc-messages-show-chevron {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .grpc-messages-show-chevron {
      transition: none;
    }
  }
`;
