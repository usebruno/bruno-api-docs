import React from 'react';
import IconButton from '@usebruno/api-shared/ui/IconButton/IconButton';
import { BrunoGlyph, SidebarToggleIcon, CloseIcon, ChevronDownIcon } from '@usebruno/api-shared/assets/icons';
import DockSwitcher from '../DockSwitcher/DockSwitcher';
import EnvSwitcher from '@usebruno/api-shared/components/EnvSwitcher/EnvSwitcher';
import type { DockMode } from '@usebruno/api-shared/utils/playgroundDock';
import cx from '@usebruno/api-shared/utils/cx';
import { StyledWrapper } from './StyledWrapper';

interface PlaygroundHeaderProps {
  dock: DockMode;
  onDockChange: (dock: DockMode) => void;
  showDockSwitcher?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar: () => void;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onConfigure: () => void;
  testId?: string;
}

const PlaygroundHeader: React.FC<PlaygroundHeaderProps> = ({
  dock,
  onDockChange,
  showDockSwitcher = true,
  sidebarOpen = false,
  onToggleSidebar,
  onClose,
  collapsed,
  onToggleCollapse,
  onConfigure,
  testId = 'playground-header'
}) => {
  return (
    <StyledWrapper data-testid={testId}>
      <div className="header-left">
        <IconButton
          className="header-sidebar-toggle"
          label="Toggle playground sidebar"
          title="Toggle sidebar"
          aria-pressed={sidebarOpen}
          data-testid="playground-sidebar-toggle"
          onClick={onToggleSidebar}
        >
          <SidebarToggleIcon active={sidebarOpen} />
        </IconButton>
        <span className="header-brand">
          <BrunoGlyph />
          <span className="header-title">Bruno Playground</span>
        </span>
      </div>
      <div className="header-right">
        <EnvSwitcher
          testId="playground-env-switcher"
          onConfigure={onConfigure}
        />
        {showDockSwitcher && <DockSwitcher dock={dock} onDockChange={onDockChange} />}
        {onToggleCollapse && (
          <IconButton
            className={cx('header-collapse', { collapsed })}
            label={collapsed ? 'Expand playground' : 'Collapse playground'}
            title={collapsed ? 'Expand' : 'Collapse'}
            data-testid="playground-collapse"
            onClick={onToggleCollapse}
          >
            <ChevronDownIcon />
          </IconButton>
        )}
        <IconButton className="header-close" label="Close playground" title="Close" data-testid="playground-close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
    </StyledWrapper>
  );
};

export default PlaygroundHeader;
