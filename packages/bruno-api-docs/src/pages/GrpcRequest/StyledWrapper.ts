import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  max-width: 100rem;
  margin: 0 auto;
  color: var(--text-primary);
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;

  .grpc-request-empty {
    margin-top: 1.5rem;
  }

  .grpc-request-fullwidth {
    margin-top: 2rem;
    padding-top: 2rem;
  }

  .grpc-request-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 2.75rem;
    align-items: start;
    margin-top: 1.25rem;
  }

  .grpc-request-col-left {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .grpc-request-col-right {
    min-width: 0;
    position: sticky;
    top: 1.25rem;
    align-self: start;
  }

  .grpc-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    background-color: var(--oc-background-mantle);
  }

  .grpc-field-icon {
    flex-shrink: 0;
    display: inline-flex;
    color: var(--text-tertiary);
  }

  .grpc-field-text {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .grpc-field-meta {
    flex-shrink: 0;
    font-family: var(--font-sans);
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--text-tertiary);
  }

  @container docs (max-width: 1024px) {
    .grpc-request-columns {
      grid-template-columns: 1fr;
      gap: 1.75rem;
    }
    .grpc-request-col-right {
      position: static;
    }
  }
`;
