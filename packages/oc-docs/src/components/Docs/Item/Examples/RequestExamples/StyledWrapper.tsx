import styled from '@emotion/styled';

const StyledWrapper = styled.div`
  margin-top: 1rem;

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .examples-container {
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .example-tabs {
    display: flex;
    gap: 0;
    background-color: var(--bg-secondary, #f9fafb);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    overflow-x: auto;
  }

  .example-tab {
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

  .example-tab:hover {
    color: var(--text-primary, #111827);
    background-color: var(--bg-primary, #ffffff);
  }

  .example-tab.active {
    color: var(--primary-color, #3b82f6);
    border-bottom-color: var(--primary-color, #3b82f6);
    background-color: var(--bg-primary, #ffffff);
  }

  .example-content {
    padding: 0;
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
