import styled from '@emotion/styled';

export const StyledWrapper = styled.li`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.3rem 0;
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: var(--oc-font-size-sm);
  line-height: 1.5;
  letter-spacing: normal;
  color: var(--oc-text);

  &:last-child {
    border-bottom: none;
  }

  .environment-summary-spacer {
    flex: 1;
  }

  .environment-summary-vars {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }
`;
