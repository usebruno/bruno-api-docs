import styled from '@emotion/styled';

export const StyledWrapper = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  line-height: 0;
  transition: color 0.12s ease;

  &:hover,
  &:focus-visible {
    color: var(--primary-color);
  }

  &.inherited-source--static {
    cursor: default;
  }

  svg {
    width: 1rem;
    height: 1rem;
    flex: none;
  }
`;
