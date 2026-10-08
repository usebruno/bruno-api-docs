import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .config-group:not(:first-child) {
    margin-top: 1.75rem;
  }

  .config-group-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }
  .config-group-head .config-group-label {
    margin: 0;
  }

  .config-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.5rem;
  }

  @container docs (max-width: 900px) {
    .config-columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .config-column {
    min-width: 0;
  }

  .config-column .property-empty-message {
    display: flex;
    align-items: center;
    min-height: 2rem;
    padding: 0.5rem 0.875rem;
    border-radius: var(--oc-radius);
    background: var(--oc-background-base);
    box-shadow: inset 0 0 0 0.0625rem var(--border-color);
    color: var(--text-tertiary);
  }

  .config-phase-label {
    margin: 0 0 0.375rem 0;
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 0.625rem;
    line-height: 1;
    letter-spacing: 0.0525rem;
    text-transform: none;
    color: var(--text-tertiary);
  }
`;
