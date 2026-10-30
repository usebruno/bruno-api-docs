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

  .response-loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background-color: var(--oc-request-tab-panel-response-overlay-bg);
  }

  .loading-text {
    color: var(--text-secondary);
    font-weight: 500;
  }

  @keyframes rotateCounterClockwise {
    to {
      transform: rotate(-360deg);
    }
  }

  button.cancel-request {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--oc-button2-color-secondary-border);
    border-radius: var(--oc-border-radius-base);
    background-color: var(--oc-button2-color-secondary-bg);
    color: var(--oc-button2-color-secondary-text);
    font-size: var(--oc-font-size-sm);
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: color-mix(in srgb, var(--oc-button2-color-secondary-bg) 97%, black);
      background-color: hsl(from var(--oc-button2-color-secondary-bg) h s calc(l - 3));
      border-color: color-mix(in srgb, var(--oc-button2-color-secondary-border) 97%, black);
      border-color: hsl(from var(--oc-button2-color-secondary-border) h s calc(l - 3));
    }
    &:active {
      background-color: color-mix(in srgb, var(--oc-button2-color-secondary-bg) 93%, black);
      background-color: hsl(from var(--oc-button2-color-secondary-bg) h s calc(l - 7));
    }
    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--oc-button2-color-secondary-text) 40%, transparent);
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
