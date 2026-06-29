import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 48px;

  @media (max-width: 1024px) {
    padding: 32px 28px;
  }
  @media (max-width: 768px) {
    padding: 24px 18px;
  }

  .page-body {
    flex: 1 0 auto;
  }
`;
