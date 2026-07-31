import styled from '@emotion/styled';

export const StyledWrapper = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  cursor: pointer;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: var(--oc-radius);
  font-family: var(--font-sans);

  &[data-active='true'] {
    background: var(--oc-background-mantle);
  }

  &:focus-visible {
    outline: 2px solid var(--oc-accents-primary);
    outline-offset: -2px;
  }

  .search-result-method {
    flex-shrink: 0;
    display: inline-block;
    width: 26px;
    margin-top: 1px;
    text-align: left;
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 10.5px;
    letter-spacing: 0.42px;
    color: var(--method-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-result-icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    width: 26px;
    margin-top: 1px;
    color: var(--oc-colors-text-subtext1);

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .search-result-kind {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-result-body {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .search-result-title-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .search-result-name {
    flex: 0 1 auto;
    min-width: 0;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.3;
    color: var(--oc-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-hl {
    font-weight: 700;
  }

  .search-result-breadcrumb {
    flex: 0 100 auto;
    min-width: 0;
    font-size: 11px;
    line-height: 1.3;
    color: var(--oc-colors-text-subtext1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-result-count {
    font-size: 11px;
    line-height: 1.2;
    color: var(--oc-colors-text-subtext1);
  }

  .search-result-url {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.2;
    color: var(--oc-colors-text-subtext1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
