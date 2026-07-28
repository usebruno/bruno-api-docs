import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.5rem;
  border: 0.0625rem solid var(--oc-border-border0);
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  overflow: hidden;

  .code-editor-copy {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 4;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  &:hover .code-editor-copy,
  .code-editor-copy:focus-visible {
    opacity: 1;
  }

  /* Variable token colours. Scoped under .monaco-editor + !important so they win
     over Monaco's own syntax-token colours (.mtkN), which load after our styles. */
  .monaco-editor .variable-valid {
    color: var(--oc-codemirror-variable-valid) !important;
  }
  .monaco-editor .variable-invalid {
    color: var(--oc-codemirror-variable-invalid) !important;
  }
  .monaco-editor .variable-prompt {
    color: var(--oc-codemirror-variable-prompt) !important;
  }
`;
