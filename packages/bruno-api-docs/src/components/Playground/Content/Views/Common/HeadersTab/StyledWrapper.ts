import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  .title {
    color: var(--text-primary);
  }

  .description {
    color: var(--text-secondary);
  }

  .key-value-table .section-header-row td {
    background: var(--oc-sidebar-bg);
    border-bottom: 0.0625rem solid var(--oc-border-border0);
  }

  .headers-section-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    min-height: 2.1875rem;
    padding: 0.5rem 0.625rem;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: left;
    color: var(--text-primary);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .headers-section-toggle svg {
    flex: none;
    width: 0.875rem;
    height: 0.875rem;
  }

  .key-value-table .inherited-header-row .text-readonly {
    font-style: italic;
    color: var(--text-muted);
  }

  .toggle-inherited-headers {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-primary);
    cursor: pointer;
  }

  .toggle-inherited-headers svg {
    width: 1rem;
    height: 1rem;
  }

  .toggle-inherited-headers:hover span {
    text-decoration: underline;
  }

  .bulk-edit-toggle {
    color: var(--oc-text-link);
    cursor: pointer;
  }
`;
