import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .actions-dropdown { display: flex; }
  .actions-buttons { display: none; }

  .expandable & {
    .actions-dropdown { display: none; }
    .actions-buttons { display: flex; align-items: center; gap: 0.5rem; }
  }
`;
