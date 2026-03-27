import styled from '@emotion/styled';

const StyledWrapper = styled.div`
  margin-top: 1rem;

  .examples-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem 0;
  }

  .examples-container {
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid var(--border-color, #e5e7eb);
    background-color: var(--bg-primary, #ffffff);
  }

  .status-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--bg-secondary, #f9fafb);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    overflow-x: auto;
  }

  .status-tabs-left {
    display: flex;
    gap: 0;
  }

  .status-tab {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    border-bottom: 2px solid transparent;
    background-color: transparent;
    color: var(--text-secondary, #6b7280);
    white-space: nowrap;
  }

  .status-tab:hover {
    color: var(--text-primary, #111827);
    background-color: var(--bg-primary, #ffffff);
  }

  .status-tab.active {
    color: var(--primary-color, #3b82f6);
    border-bottom-color: var(--primary-color, #3b82f6);
    background-color: var(--bg-primary, #ffffff);
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-right: 0.75rem;
  }

  .content-toggle {
    display: flex;
    align-items: center;
    background-color: var(--bg-primary, #ffffff);
    border-radius: 0.25rem;
    padding: 0.125rem;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .toggle-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 0.125rem;
    transition: all 0.15s ease;
  }

  .toggle-btn:hover {
    color: var(--text-primary, #111827);
  }

  .toggle-btn.active {
    color: var(--text-primary, #111827);
    background-color: var(--bg-secondary, #f3f4f6);
  }

  .example-select {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 500;
    background-color: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    color: var(--text-primary, #111827);
    cursor: pointer;
    min-width: 100px;
    text-align: left;
  }

  .example-select:focus {
    outline: none;
    border-color: var(--primary-color, #3b82f6);
  }

  .example-select.single {
    cursor: default;
    background-color: var(--bg-secondary, #f9fafb);
    border-color: transparent;
  }

  .headers-table {
    width: 100%;
    font-size: 0.75rem;
    border-collapse: collapse;
  }

  .headers-table th {
    padding: 0.5rem 1rem;
    text-align: left;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    background-color: var(--bg-secondary, #f9fafb);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .headers-table td {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    color: var(--text-primary, #111827);
    font-family: var(--font-mono, monospace);
  }

  .headers-table tr:last-child td {
    border-bottom: none;
  }

  .body-content {
    padding: 0.75rem 1rem;
    overflow-x: auto;
    background-color: var(--code-bg, #f8fafc);
  }

  .body-content pre {
    margin: 0;
    padding: 0;
    font-size: 0.75rem;
    font-family: var(--font-mono, 'SF Mono', 'Consolas', monospace);
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--code-text, #1e293b);
  }

  .no-content {
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary, #6b7280);
    font-size: 0.75rem;
  }
`;

export default StyledWrapper;
