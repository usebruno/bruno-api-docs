import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.4rem;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  font-family: var(--font-sans);
  min-width: 42px;
  margin-right: 8px;

  &.get {
    background-color: #e6f0ff;
    color: #0057b7;
  }

  &.post {
    background-color: #e6f9e6;
    color: #00824d;
  }

  &.put {
    background-color: #fff0e6;
    color: #b74600;
  }

  &.delete {
    background-color: #ffe6e6;
    color: #b70000;
  }

  &.patch {
    background-color: #f9e6f9;
    color: #6b0082;
  }

  &.options, &.head {
    background-color: #f0f0f0;
    color: #4a4a4a;
  }
`;