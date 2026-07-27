import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  padding: 1.5rem;
  text-align: center;

  .large-response-title {
    color: var(--oc-status-warning-text);
    font-weight: 600;
    font-size: var(--oc-font-size-lg);
  }

  .large-response-description {
    color: var(--text-secondary);
    font-size: var(--oc-font-size-base);
    line-height: 1.5;
  }

  .large-response-size {
    color: var(--text-primary);
    font-weight: 600;
  }

  .large-response-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .large-response-view {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.9rem;
    border: 1px solid var(--oc-border-border0);
    border-radius: var(--oc-radius);
    color: var(--text-primary);
    background-color: var(--oc-bg);
    font-size: var(--oc-font-size-base);
    cursor: pointer;
    transition: color 0.15s ease, background-color 0.15s ease;

    &:hover {
      background-color: var(--badge-bg);
    }

    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 1px;
    }
  }
`;
