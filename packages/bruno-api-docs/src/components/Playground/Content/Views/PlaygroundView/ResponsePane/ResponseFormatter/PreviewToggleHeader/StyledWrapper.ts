import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0.625rem;

  .preview-toggle-label {
    font-size: 0.8125rem;
    color: var(--oc-text);
  }

  .preview-toggle {
    position: relative;
    flex-shrink: 0;
    width: 2rem;
    height: 1rem;
    padding: 0;
    border: none;
    border-radius: 1.5rem;
    cursor: pointer;
    background: var(--oc-background-surface2);
    transition: background 0.15s ease;
  }

  .preview-toggle[aria-checked='true'] {
    background: var(--oc-accents-primary);
  }

  .preview-toggle-knob {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--oc-background-base);
    transition: left 0.15s ease;
  }

  .preview-toggle[aria-checked='true'] .preview-toggle-knob {
    left: 1.125rem;
  }
`;
