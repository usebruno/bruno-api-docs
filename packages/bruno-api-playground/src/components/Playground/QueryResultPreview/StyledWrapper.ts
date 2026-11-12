import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  height: 100%;
  overflow: auto;
  max-height: calc(100vh - 13.75rem);

  .react-pdf__Document {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .react-pdf__Page {
    max-width: 100%;
    margin-bottom: 0.75rem;
    background-color: transparent;
  }

  .react-pdf__Page__canvas {
    display: block;
    max-width: 100%;
    height: auto !important;
  }
`;
