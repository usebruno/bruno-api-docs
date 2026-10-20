import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  height: 100%;
  min-height: 0;
  background-color: var(--bg-primary);

  .tab-panel {
    min-height: 0;
    overflow-y: auto;
  }

  .tab-panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    flex-shrink: 0;
  }

  .tab-panel-content:not(:first-child) {
    padding-bottom: 1rem;
  }

  .tabs-right {
    gap: 0.75rem;
  }

  .response-actions-measure {
    position: absolute;
    top: 0;
    left: 0;
    visibility: hidden;
    pointer-events: none;
  }

  & .send-icon {
    padding: 0.5625rem;
    border-radius: 50%;
    background: var(--oc-background-mantle);
  }

  .stopwatch {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .loading-icon {
    display: inline-flex;
    color: var(--text-secondary);
    animation: rotateCounterClockwise 1s linear infinite;
  }

  @keyframes rotateCounterClockwise {
    to {
      transform: rotate(-360deg);
    }
  }

  button.cancel-request {
    height: 1.75rem;
    padding: 0 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;

    &:hover {
      color: var(--text-primary);
    }
    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  }

  .empty-hint {
    color: var(--oc-tabs-secondary-inactive-color);
  }

  .status-meta-label {
    color: var(--text-secondary);
  }

  .status-meta-value {
    color: var(--text-primary);
  }
`;

export const SendIconWrapper = styled.div`
  padding: 0.5625rem;
  border-radius: 50%;
  background: var(--oc-background-mantle);

  svg {
    color: var(--text-muted);
  }
`;
