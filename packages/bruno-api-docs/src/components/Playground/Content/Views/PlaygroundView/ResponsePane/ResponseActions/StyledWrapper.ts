import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  align-items: center;

  .actions-dropdown { display: flex; }
  .actions-buttons { display: none; }

  .more-actions-button {
    border: 1px solid var(--oc-input-border);
    height: 1.25rem;
  }

  .expandable & {
    .actions-dropdown { 
      display: none; 
    }
    .actions-buttons { 
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }
  }
`;
