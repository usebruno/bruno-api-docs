import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  .title {
    color: var(--text-primary);
  }

  .description {
    color: var(--text-secondary);
  }

  .auth-header {
    margin-bottom: 0.75rem;
  }

  .auth-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .auth-empty {
    margin: 0;
    font-style: italic;
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .auth-inherited {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .auth-inherited-source {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .auth-inherited-source-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .auth-inherited-mode {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 0.25rem;
    padding: 0;
    font: inherit;
    color: var(--primary-text);
    background: transparent;
    border: none;
    white-space: nowrap;
  }

  button.auth-inherited-mode {
    cursor: pointer;
  }

  button.auth-inherited-mode:hover {
    opacity: 0.8;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;
