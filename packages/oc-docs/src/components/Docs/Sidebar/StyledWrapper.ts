import styled from '@emotion/styled';

export const SidebarContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  &.compact {
    min-width: var(--sidebar-width-compact);
    max-width: var(--sidebar-width-compact);
  }

  & ::-webkit-scrollbar {
    width: 0;
  }

  & ::-webkit-scrollbar-track {
    background: transparent;
  }

  & ::-webkit-scrollbar-thumb {
    background-color: transparent;
  }

  &:hover ::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.12);
  }

  & .logo {
    padding: 0 8px 12px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    margin-bottom: 6px;
  }

  &.compact .logo {
    padding: 8px;
  }
`;

export const SidebarItems = styled.div`
  padding: 0 6px;
  overflow-y: auto;
  flex-grow: 1;

  ${SidebarContainer}.compact & {
    padding: 0 4px;
  }
`;

export const SidebarItem = styled.div`
  cursor: pointer;
  transition: all 0.12s ease;
  border-radius: 6px;
  margin-bottom: 0;
  position: relative;
  overflow: hidden;
  padding: 5px 10px;
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 13px;

  ${SidebarContainer}.compact & {
    padding: 4px 8px;
    font-size: 12px;
    margin-bottom: 1px;
  }

  &:hover, &.hovered {
    background-color: rgba(0, 0, 0, 0.04);
    color: var(--text-primary);
  }

  &.active {
    background-color: rgba(217, 119, 6, 0.08);
    color: var(--text-primary);
    font-weight: 500;
  }

  &.active:hover {
    background-color: rgba(217, 119, 6, 0.1);
  }

  &.folder {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 12.5px;
  }

  &.folder:hover {
    background-color: transparent;
  }

  & .method-badge {
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 3px;
    font-weight: 700;
    min-width: 36px;
    text-align: center;
    letter-spacing: 0.05em;
    transition: all 0.12s ease;
    text-transform: uppercase;
    margin-right: 8px;
    font-family: var(--font-mono);
  }

  ${SidebarContainer}.compact & .method-badge {
    padding: 2px 4px;
    min-width: 36px;
    font-size: 10px;
  }

  & * {
    pointer-events: none;
  }

  & svg {
    pointer-events: all;
  }

  ${SidebarContainer}.compact & svg {
    width: 14px;
    height: 14px;
  }
`;
