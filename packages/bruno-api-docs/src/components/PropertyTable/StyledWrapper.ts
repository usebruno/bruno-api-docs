import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
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
    font-size: var(--oc-font-size-base);
    line-height: 1.2;
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
    grid-template-columns: minmax(8.75rem, 15rem) minmax(0, 1fr);
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
    font-size: var(--oc-font-size-sm);
    line-height: 1.2;
    letter-spacing: normal;
    color: var(--text-primary);
    white-space: nowrap;
    overflow-x: clip;
    overflow-y: visible;
    text-overflow: ellipsis;
  }
  .property-key .oc-truncate {
    overflow-x: clip;
    overflow-y: visible;
  }
  .property-value-cell {
    margin: 0;
    min-width: 0;
    font-family: 'Fira Code', var(--font-mono);
    font-weight: 400;
    font-size: var(--oc-font-size-sm);
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
  .property-row:has(> .property-trailing) {
    grid-template-columns: minmax(8.75rem, 15rem) minmax(0, 1fr) auto;
    padding-right: 0;
  }
  .property-trailing {
    grid-column: 3;
    grid-row: 1;
    align-self: stretch;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: sticky;
    right: 0;
    z-index: 1;
    padding-left: 0.5rem;
    padding-right: 0.875rem;
    background: var(--oc-background-base);
  }
  .property-trailing:has(> .inherited-source) {
    padding-right: 0.5rem;
  }
  .property-row:has(> .property-trailing) .description {
    grid-column: 1 / 3;
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
  .property-value-placeholder {
    font-style: italic;
    color: var(--text-tertiary);
  }
  .property-type {
    flex-shrink: 0;
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-xs);
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
    .property-row:has(> .property-trailing) {
      grid-template-columns: 8.75rem minmax(0, 1fr) auto;
    }
    .property-value-main .oc-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
