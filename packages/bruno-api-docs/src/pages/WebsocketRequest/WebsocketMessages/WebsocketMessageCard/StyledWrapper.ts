import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  border: 1px solid var(--border-color);
  border-radius: var(--oc-radius);
  overflow: hidden;
  background: var(--oc-background-base);

  &:not(:first-of-type) {
    margin-top: 0.75rem;
  }

  .websocket-message-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .websocket-message-toggle {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0;
    margin: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;
  }
  .websocket-message-toggle:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .websocket-message-chevron {
    flex: 0 0 auto;
    color: var(--text-muted);
  }

  .websocket-message-title {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--text-primary);
  }

  .websocket-message-detail {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.22s ease;
  }
  .websocket-message-detail.is-open {
    grid-template-rows: 1fr;
  }
  .websocket-message-detail-clip {
    overflow: hidden;
    min-height: 0;
  }
  .websocket-message-detail-body {
    border-top: 1px solid var(--border-color);
  }
  .websocket-message-detail-body .code-content-numbered {
    min-height: 2.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .websocket-message-detail {
      transition: none;
    }
  }
`;
