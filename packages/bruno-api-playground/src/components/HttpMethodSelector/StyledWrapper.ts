import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  .method-select {
    appearance: none;
    display: inline-flex;
    align-items: center;
    margin: 0;
    padding: 0;
    padding-left: 0.5rem;
    margin-left: -0.5rem;
    background-color: transparent;
    border: none;
    outline: none;
    cursor: pointer;
  }

  .method-select .method-badge {
    display: inline-block;
    max-width: 16ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    line-height: 1.125rem;
    letter-spacing: 0.04em;
    min-width: unset;
    padding: 0;
  }

  .method-custom-input {
    flex: 0 0 auto;
    max-width: 16ch;
    padding: 0;
    border: none;
    outline: none;
    background-color: transparent;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 0.75rem;
    line-height: 1.125rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
`;
