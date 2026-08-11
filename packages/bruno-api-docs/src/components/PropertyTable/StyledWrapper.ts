import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  overflow-x: auto;
  container-type: inline-size;
  container-name: proptable;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  &::-webkit-scrollbar {
    height: 0.5rem;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 999px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &.property-table--framed {
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
  }

  .property-empty-message {
    margin: 0;
    font-family: var(--font-sans);
    font-weight: 500;
    font-style: italic;
    font-size: 0.8125rem;
    line-height: 1;
    letter-spacing: normal;
    color: var(--text-secondary);
  }

  .property-box {
    margin: 0;
    background: var(--oc-background-base);
    width: max-content;
    min-width: 100%;
  }

  .property-row {
    display: grid;
    grid-template-columns: minmax(8.75rem, max-content) minmax(0, 1fr);
    align-items: center;
    column-gap: 1.5rem;
    row-gap: 0;
    padding: 0.5rem 0.875rem;
    min-height: 2rem;
  }
  .property-key {
    grid-column: 1;
    grid-row: 1;
  }
  .property-value-cell {
    grid-column: 2;
    grid-row: 1;
  }
  .property-row .description {
    grid-column: 1 / -1;
    grid-row: 2;
    min-width: 100%;
    max-width: 0;
  }
  .property-row + .property-row {
    border-top: 1px solid var(--border-color);
  }
  &.property-table--no-row-borders .property-row + .property-row {
    border-top: none;
  }

  .property-key {
    font-family: var(--font-sans);
    font-weight: 400;
    font-size: 0.75rem;
    line-height: 1.2;
    letter-spacing: normal;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .property-value-cell {
    margin: 0;
    min-width: 0;
    font-family: 'Fira Code', var(--font-mono);
    font-weight: 400;
    font-size: 0.75rem;
    line-height: 1.2;
    letter-spacing: normal;
    color: var(--text-primary);
  }
  .property-value-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .property-value-line .disabled-badge {
    margin-left: auto;
    align-self: center;
    flex: none;
  }
  .property-row > .inherited-source {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    align-self: stretch;
    position: sticky;
    right: 0;
    z-index: 1;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    background: var(--oc-background-base);
  }
  .property-row:has(.description) > .inherited-source {
    grid-row: 1 / span 2;
  }
  .property-row:has(> .inherited-source) .property-value-cell {
    padding-right: 2.5rem;
  }
  .property-row:has(> .inherited-source) .description {
    min-width: calc(100% - 2.5rem);
  }
  .property-value-main {
    min-width: 0;
    flex: 0 1 auto;
    color: var(--oc-colors-text-subtext2);
    white-space: nowrap;
  }
  .property-value-main .oc-truncate {
    overflow: visible;
    text-overflow: clip;
  }
  .property-type {
    flex-shrink: 0;
    font-family: var(--font-sans);
    font-size: 0.6875rem;
    line-height: 1.2;
    color: var(--text-muted);
  }
  .property-value-cell .secret-value-text {
    font-family: inherit;
  }

  @container docs (max-width: 900px) {
    .property-box {
      width: auto;
    }
    .property-row {
      grid-template-columns: 8.75rem minmax(0, 1fr);
    }
    .property-value-main .oc-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
