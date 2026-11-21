import React, { useEffect, useRef, useState } from 'react';
import { usePlaygroundUrlState, useIsMobilePhone } from '@usebruno/api-shared/hooks';
import { playgroundRuns } from '@usebruno/api-shared/session/playgroundRuns';
import IconButton from '@usebruno/api-shared/ui/IconButton/IconButton';
import { SidebarToggleIcon } from '@usebruno/api-shared/assets/icons';
import { usePlayground } from '../../../state/playground';
import PlaygroundBody from '../PlaygroundBody/PlaygroundBody';
import { StyledWrapper } from './StyledWrapper';

const keepSidebarOpen = () => {};

const StandalonePlayground: React.FC = () => {
  const { requestSlug, exampleSlug } = usePlaygroundUrlState();
  const appliedSlugRef = useRef<string | null>(null);
  const { workspace } = usePlayground();
  const isPhone = useIsMobilePhone();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => () => {
    for (const uuid of Object.keys(workspace.get().requestStartedAt)) playgroundRuns.cancel(uuid);
  }, [workspace]);

  const sidebar = isPhone
    ? {
        sidebarOpen,
        dock: 'inline' as const,
        onCloseSidebar: () => setSidebarOpen(false),
        onOpenSidebar: () => setSidebarOpen(true)
      }
    : { sidebarOpen: true, dock: 'modal' as const, onCloseSidebar: keepSidebarOpen, onOpenSidebar: keepSidebarOpen };

  return (
    <StyledWrapper className="oc-playground" data-testid="standalone-playground">
      {isPhone && (
        <div className="standalone-toolbar">
          <IconButton
            className="standalone-sidebar-toggle"
            label="Toggle playground sidebar"
            title="Toggle sidebar"
            aria-pressed={sidebarOpen}
            data-testid="playground-sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <SidebarToggleIcon active={sidebarOpen} />
          </IconButton>
        </div>
      )}
      <PlaygroundBody
        requestSlug={requestSlug}
        exampleSlug={exampleSlug}
        appliedSlugRef={appliedSlugRef}
        {...sidebar}
      />
    </StyledWrapper>
  );
};

export default StandalonePlayground;
