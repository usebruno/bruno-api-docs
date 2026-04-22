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
    background-color: var(--bg-primary, #ffffff);
  }

  .example-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--bg-secondary, #f9fafb);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .example-tabs-left {
    display: flex;
    gap: 0;
    overflow-x: auto;
  }

  .example-tabs-right {
    padding-right: 0.75rem;
  }

  .example-url-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--bg-primary, #ffffff);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    font-family: var(--font-mono, 'SF Mono', 'Consolas', monospace);
    font-size: 0.75rem;
  }

  .example-url-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .example-method {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #ffffff;
  }

  .example-method.get { background-color: #10b981; }
  .example-method.post { background-color: #3b82f6; }
  .example-method.put { background-color: #f59e0b; }
  .example-method.patch { background-color: #a855f7; }
  .example-method.delete { background-color: #ef4444; }

  .example-url {
    color: var(--text-primary, #111827);
    word-break: break-all;
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
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
  }

  @media (max-width: 768px) {
    .example-content {
      grid-template-columns: 1fr;
    }
  }

  .content-section {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color, #e5e7eb);
    min-height: 150px;
  }

  .content-section:last-child {
    border-right: none;
  }

  @media (max-width: 768px) {
    .content-section {
      border-right: none;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .content-section:last-child {
      border-bottom: none;
    }
  }

  .section-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    min-height: 40px;
  }

  .content-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .status-badge.success {
    background-color: #dcfce7;
    color: #166534;
  }

  .status-badge.redirect {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-badge.client-error {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-badge.server-error {
    background-color: #fecaca;
    color: #7f1d1d;
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

  .toggle-btn.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .copy-curl-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .copy-curl-btn:hover {
    color: var(--text-primary, #111827);
    border-color: var(--text-secondary, #6b7280);
  }

  .copy-curl-btn.copied {
    color: #16a34a;
    border-color: #16a34a;
  }

  .copy-curl-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .copy-dropdown {
    position: relative;
  }

  .copy-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 10;
    min-width: 120px;
    overflow: hidden;
  }

  .copy-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-primary, #111827);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s ease;
  }

  .copy-menu-item:hover {
    background-color: var(--bg-secondary, #f9fafb);
  }

  .copy-menu-item.copied {
    color: #16a34a;
  }

  .body-content {
    padding: 0.75rem 1rem;
    overflow-x: auto;
    background-color: var(--code-bg, #f8fafc);
    flex: 1;
    position: relative;
  }

  .body-copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.25rem;
    cursor: pointer;
    color: var(--text-secondary, #6b7280);
    transition: all 0.15s ease;
    opacity: 0;
  }

  .body-content:hover .body-copy-btn {
    opacity: 1;
  }

  .body-copy-btn:hover {
    color: var(--text-primary, #111827);
    border-color: var(--text-secondary, #6b7280);
  }

  .body-copy-btn.copied {
    color: #16a34a;
    border-color: #16a34a;
    opacity: 1;
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

  .no-content {
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary, #6b7280);
    font-size: 0.75rem;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export default StyledWrapper;
