import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  max-width: 100rem;
  margin: 0 auto;
  color: var(--text-primary);
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;
  --sticky-url-clearance: 4.25rem;

  .websocket-request-title {
    margin-top: 0.25rem;
  }

  .websocket-request-url-sticky {
    position: sticky;
    top: 1rem;
    z-index: 2;
    margin-top: 0.75rem;
    background: var(--content-bg);
    box-shadow: 0 0 0 1rem var(--content-bg);
  }

  .websocket-request-description {
    margin-top: 1.5rem;
  }

  .websocket-request-empty {
    margin-top: 1.5rem;
  }

  .websocket-request-messages {
    margin-top: 1.25rem;
  }

  .websocket-request-messages + .websocket-request-columns {
    margin-top: 1.5rem;
  }

  .websocket-request-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 2.75rem;
    align-items: start;
    margin-top: 1.25rem;
  }

  .websocket-request-col-left {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .websocket-request-col-right {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: sticky;
    top: var(--sticky-url-clearance);
    align-self: start;
  }

  @container docs (max-width: 1024px) {
    .websocket-request-columns {
      grid-template-columns: 1fr;
      gap: 1.75rem;
    }
    .websocket-request-col-right {
      position: static;
    }
  }
`;
