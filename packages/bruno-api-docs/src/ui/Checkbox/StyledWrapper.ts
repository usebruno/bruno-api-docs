import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  position: relative;
  flex: none;
  display: inline-flex;
  width: 1rem;
  height: 1rem;

  input {
    appearance: none;
    -webkit-appearance: none;
    margin: 0;
    width: 1rem;
    height: 1rem;
    border: 1px solid var(--oc-checkbox-border);
    border-radius: 0.1875rem;
    background-color: transparent;
    cursor: pointer;
  }

  input:checked {
    background-color: var(--oc-checkbox-checked-bg);
    border-color: var(--oc-checkbox-checked-bg);
  }

  input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  input:disabled:checked {
    background-color: var(--oc-colors-text-muted);
    border-color: var(--oc-colors-text-muted);
  }

  .checkbox-check {
    position: absolute;
    inset: 0;
    width: 0.75rem;
    height: 0.75rem;
    margin: auto;
    pointer-events: none;
    color: var(--oc-checkbox-check-color);
    opacity: 0;
  }

  input:checked + .checkbox-check {
    opacity: 1;
  }
`;
