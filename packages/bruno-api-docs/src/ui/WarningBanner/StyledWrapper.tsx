import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  background-color: var(--bg-secondary);
  border: 1px solid var(--oc-border-border2);
  border-left: 0.25rem solid var(--oc-status-warning-border);
  border-radius: var(--oc-radius);
  padding: 1rem;

  .warning-title {
    font-weight: 600;
    color: var(--oc-status-warning-text);
    margin-bottom: 0.5rem;
  }

  .warning-message {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.3rem;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    color: var(--text-primary);
  }

  .warning-message + .warning-message {
    margin-top: 0.5rem;
  }
`;
