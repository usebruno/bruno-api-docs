import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.4rem;
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  text-transform: uppercase;
  font-family: var(--font-sans);
  min-width: 36px;
  margin-right: 8px;
  letter-spacing: 0.05em;

  &.get {
    background-color: rgba(37, 99, 235, 0.1);
    color: #2563eb;
  }

  &.post {
    background-color: rgba(22, 163, 74, 0.1);
    color: #16a34a;
  }

  &.put {
    background-color: rgba(217, 119, 6, 0.1);
    color: #d97706;
  }

  &.delete {
    background-color: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  &.patch {
    background-color: rgba(147, 51, 234, 0.1);
    color: #9333ea;
  }

  &.options, &.head {
    background-color: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }
`;
