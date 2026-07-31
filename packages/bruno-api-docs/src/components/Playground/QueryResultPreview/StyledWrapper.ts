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

  /* Render each page at its natural width but never wider than the pane, keeping the aspect ratio
     (react-pdf sets an explicit inline height that must yield to the scaled width). Centered by the
     flex column above. */
  .react-pdf__Page__canvas {
    display: block;
    max-width: 100%;
    height: auto !important;
  }
`;
