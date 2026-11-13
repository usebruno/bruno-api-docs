import styled from '@emotion/styled';

export const StyledWrapper = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 0.8125rem;
  line-height: 1;
  color: var(--primary-text);

  .expand-toggle-chevron {
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  &[aria-expanded='true'] .expand-toggle-chevron {
    transform: rotate(180deg);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .expand-toggle-chevron {
      transition: none;
    }
  }
`;
