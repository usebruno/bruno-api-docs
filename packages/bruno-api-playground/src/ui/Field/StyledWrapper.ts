import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;

  .oc-label {
    font-size: var(--oc-font-size-base);
    font-weight: 400;
    line-height: 1;
    color: var(--text-muted);
  }
`;
