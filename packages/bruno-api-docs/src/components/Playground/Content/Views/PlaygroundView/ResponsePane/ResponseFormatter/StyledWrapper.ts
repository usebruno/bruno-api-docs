import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-width: 11.875rem;
  padding: 0.25rem;

  .preview-toggle-label {
    font-size: 0.8125rem;
    color: var(--oc-text);
  }

  .preview-toggle {
    position: relative;
    flex-shrink: 0;
    width: 2.125rem;
    height: 1.125rem;
    padding: 0;
    border: none;
    border-radius: 0.5625rem;
    cursor: pointer;
    background: var(--oc-background-surface2);
    transition: background 0.15s ease;
  }

  .preview-toggle[aria-checked='true'] {
    background: var(--oc-accents-primary);
  }

  .preview-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: var(--oc-background-base);
    transition: left 0.15s ease;
  }

  .preview-toggle[aria-checked='true'] .preview-toggle-knob {
    left: 1.125rem;
  }
`;
