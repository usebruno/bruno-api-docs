import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 1.25rem 1.25rem;
  background: var(--bg-primary);

  .script-file-editor {
    flex: 1;
    min-height: 0;
  }
`;
