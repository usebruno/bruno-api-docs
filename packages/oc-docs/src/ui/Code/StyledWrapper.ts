import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  background-color: var(--code-bg);
  border: 1px solid #ebeef1;
  border-radius: 8px;

  .code-copy-floating {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem;
    border-radius: 4px;
    border: none;
    color: #687385;
    background-color: rgba(0, 0, 0, 0.04);
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s ease;
  }

  &:hover .code-copy-floating {
    opacity: 1;
  }

  .code-copy-floating:hover {
    color: #30313d;
    background-color: rgba(0, 0, 0, 0.08);
  }

  .code-content {
    background-color: var(--code-bg);
    color: var(--text-primary);
  }

  .code-content::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .code-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .code-content::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .code-content:hover::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
  }

  .code-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }

  .code-content pre {
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.65;
  }

  .code-content code {
    color: var(--text-primary);
    font-size: 13px;
  }
`;