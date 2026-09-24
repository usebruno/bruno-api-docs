import styled from '@emotion/styled';
import { Modal } from '@/ui/Modal/Modal';

export const StyledWrapper = styled(Modal)`
  .modal-dialog {
    width: min(34rem, 100%);
  }

  .prompt-variables-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .prompt-variables-body {
    max-height: 60vh;
    overflow-y: auto;
    padding: 0 0.2rem;
  }

  .prompt-variables-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .prompt-variable-label {
    display: block;
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--text-primary);
  }

  input.prompt-variable-input {
    display: block;
    width: 100%;
    margin-top: 0.5rem;
    line-height: 1.5;
    padding: 0.45rem;
    border-radius: var(--oc-radius);
    background-color: var(--oc-background-base);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 0.8125rem;

    &::placeholder {
      color: var(--text-secondary);
      opacity: 0.7;
    }

    &:focus {
      border-color: var(--oc-brand);
      outline: none;
    }
  }

  .prompt-variables-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 1.875rem;
      padding: 0 0.875rem;
      border-radius: var(--oc-radius);
      font-family: var(--font-sans);
      font-weight: 500;
      font-size: 0.8125rem;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    button.prompt-variables-cancel {
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);

      &:hover {
        color: var(--text-primary);
      }
    }

    button.prompt-variables-submit {
      border: 1px solid var(--oc-brand);
      background-color: var(--oc-brand);
      color: var(--oc-background-base);
      font-weight: 600;

      &:hover {
        opacity: 0.92;
      }
    }
  }
`;
