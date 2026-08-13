import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .table-cell {
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .grpc-metadata-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    font-family: var(--font-mono);
    color: var(--oc-colors-text-subtext2);
  }
  .grpc-metadata-value .disabled-badge {
    margin-left: auto;
    flex-shrink: 0;
  }

  .table-cell:last-child {
    color: var(--oc-colors-text-subtext0);
  }
`;
