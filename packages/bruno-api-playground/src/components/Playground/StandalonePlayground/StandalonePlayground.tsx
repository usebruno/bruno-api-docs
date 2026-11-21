import React, { useRef } from 'react';
import { usePlaygroundUrlState } from '@usebruno/api-shared/hooks';
import PlaygroundBody from '../PlaygroundBody/PlaygroundBody';
import { StyledWrapper } from './StyledWrapper';

const keepSidebarOpen = () => {};

const StandalonePlayground: React.FC = () => {
  const { requestSlug, exampleSlug } = usePlaygroundUrlState();
  const appliedSlugRef = useRef<string | null>(null);

  return (
    <StyledWrapper className="oc-playground" data-testid="standalone-playground">
      <PlaygroundBody
        requestSlug={requestSlug}
        exampleSlug={exampleSlug}
        sidebarOpen
        dock="modal"
        onCloseSidebar={keepSidebarOpen}
        onOpenSidebar={keepSidebarOpen}
        appliedSlugRef={appliedSlugRef}
      />
    </StyledWrapper>
  );
};

export default StandalonePlayground;
