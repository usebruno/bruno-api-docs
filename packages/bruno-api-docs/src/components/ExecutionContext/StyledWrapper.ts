import styled from '@emotion/styled';

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .exec-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .exec-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }
  .exec-card-title {
    font-size: var(--oc-font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }
  .exec-card-meta {
    font-size: var(--oc-font-size-sm);
    color: var(--text-muted);
  }

  .exec-card-box {
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    background: var(--oc-background-base);
  }
  .exec-card-box.exec-card-box--bare {
    border: none;
    background: transparent;
  }

  .exec-flow {
    font-family: var(--font-sans);
    font-size: var(--oc-font-size-xs);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0;
    color: var(--oc-colors-text-subtext1);
    border: 1px solid var(--border-color);
    border-radius: var(--oc-radius);
    padding: 0.125rem 0.25rem;
    white-space: nowrap;
  }
`;
