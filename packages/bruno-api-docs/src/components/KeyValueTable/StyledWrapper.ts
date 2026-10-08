import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  --kvt-cell-inset: 0.625rem;
  --kvt-field-inset: 0.6875rem;
  --kvt-toggle-width: 1rem;
  display: flex;
  flex-direction: column;
  width: 100%;

  .key-value-table-container {
    overflow: auto;
    border-radius: 0.375rem;
    border: 0.0625rem solid var(--oc-table-border);
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .key-value-table-container:hover {
    scrollbar-color: var(--oc-scrollbar-color) transparent;
  }

  .key-value-table-container::-webkit-scrollbar {
    width: 0.375rem;
    height: 0.375rem;
  }

  .key-value-table-container::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 0.375rem;
  }

  .key-value-table-container:hover::-webkit-scrollbar-thumb {
    background-color: var(--oc-scrollbar-color);
  }

  .key-value-table {
    width: 100%;
    min-width: 28rem;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.75rem;
  }

  .key-value-table thead {
    background-color: var(--oc-background-mantle);
    position: sticky;
    top: 0;
    z-index: 1;
    border-bottom: 0.0625rem solid var(--oc-table-border);
  }

  .key-value-table thead th {
    position: relative;
    padding: 0.5rem 0.625rem 0.4375rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0;
    color: var(--oc-table-thead-color);
    border-bottom: 0.0625rem solid var(--oc-table-border);
    border-right: 0.0625rem solid var(--oc-table-border);
    user-select: none;
  }

  .key-value-table thead th:last-child {
    border-right: none;
  }

  .key-value-table thead th.col-key {
    padding-left: calc(var(--kvt-cell-inset) + var(--kvt-field-inset));
  }

  .key-value-table--with-toggle thead th.col-key {
    padding-left: calc(var(--kvt-cell-inset) + var(--kvt-toggle-width) + var(--kvt-field-inset));
  }

  .key-value-table .col-resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    height: var(--kvt-height);
    right: -0.125rem;
    z-index: 2;
    width: 0.25rem;
    cursor: col-resize;
    touch-action: none;
    background-color: transparent;
  }

  .key-value-table .col-resize-handle:hover,
  .key-value-table .col-resize-handle.is-resizing {
    background-color: var(--primary-color);
  }

  &.is-resizing {
    cursor: col-resize;
    user-select: none;
  }

  .key-value-table col.col-key {
    width: calc(30% + 1.625rem);
  }

  .key-value-table col.col-value {
    width: auto;
  }

  .key-value-table col.col-description {
    width: 25%;
  }

  .key-value-table col.col-actions {
    width: 3.75rem;
  }

  .key-value-table .col-description {
    vertical-align: middle;
  }

  .key-value-table .col-description .highlight-input {
    width: 100%;
  }

  .key-value-table tbody tr {
    transition: background-color 0.1s ease;
  }

  .key-value-table tbody tr:hover {
    background-color: transparent;
  }

  .key-value-table tbody tr:last-child td {
    border-bottom: none;
  }

  .key-value-table tbody td {
    padding: 0;
    vertical-align: middle;
    border-bottom: 0.0625rem solid var(--oc-table-border);
    border-right: 0.0625rem solid var(--oc-table-border);
  }

  .key-value-table tbody td:last-child {
    border-right: none;
  }

  .key-value-table .key-cell {
    display: flex;
    align-items: center;
    padding-left: var(--kvt-cell-inset);
  }

  .key-value-table .checkbox-slot {
    flex: none;
    display: inline-flex;
    width: var(--kvt-toggle-width);
    height: var(--kvt-toggle-width);
  }

  .key-value-table .key-cell .highlight-input,
  .key-value-table .key-cell .text-readonly {
    flex: 1;
    min-width: 0;
  }

  .key-value-table .cell-error {
    flex: none;
    display: inline-flex;
    align-items: center;
    margin-left: 0.375rem;
    color: var(--oc-status-danger-text);
    cursor: default;
    margin-right: 0.4rem;
  }

  .key-value-table .cell-error svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  .key-value-table .col-actions {
    text-align: center;
    vertical-align: middle;
  }

  .key-value-table .text-readonly {
    display: block;
    width: 100%;
    border: 0.0625rem solid transparent;
    padding: 0.625rem;
    font-size: 0.8125rem;
    line-height: 1.25;
    color: var(--text-primary);
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .key-value-table .value-cell {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .key-value-table .value-cell-field {
    flex: 1;
    min-width: 0;
  }

  .key-value-table .value-input-tip {
    display: block;
    min-width: 0;
  }

  .key-value-table .col-value .secret-value {
    padding: 0.625rem;
  }

  .key-value-table .col-value .secret-value .secret-value-input {
    font-size: 0.8125rem;
  }

  .key-value-table .value-cell-trailing {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.625rem;
    padding-right: 0.625rem;
  }

  .key-value-table .value-cell:has(.secret-value) .value-cell-trailing {
    gap: 0.625rem;
    padding-left: 0;
    padding-right: 0.625rem;
  }

  .key-value-table .delete-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--oc-colors-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: color 0.15s ease, background-color 0.15s ease;
  }

  .key-value-table .delete-button:hover {
    color: var(--oc-colors-text-danger);
    background-color: color-mix(in srgb, var(--oc-colors-text-danger) 10%, transparent);
  }

  .key-value-table .delete-button svg {
    width: 1rem;
    height: 1rem;
  }

  .key-value-table tbody tr.empty-row {
    opacity: 0.7;
  }

  .key-value-table tbody tr.empty-row:hover {
    background-color: transparent;
  }
`;
