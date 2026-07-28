import React, { useState } from 'react';
import CopyResponse from './CopyResponse/CopyResponse';
import ClearResponse from './ClearResponse/ClearResponse';
import DownloadResponse from './DownloadResponse/DownloadResponse';
import ChangeLayout from './Change layout/ChangeLayout';
import { StyledWrapper } from './StyledWrapper';

interface ResponseActionsProps {
  orientation: 'vertical' | 'horizontal';
}

const ResponseActions: React.FC<ResponseActionsProps> = ({ orientation }) => {
  const [showActionMenu, setShowActionMenu] = useState(false);

  if (showActionMenu) {
    return null;
  }

  return (
    <StyledWrapper className="response-pane-actions-wrapper">
      <CopyResponse />
      <DownloadResponse />
      <ClearResponse />
      <ChangeLayout orientation={orientation} />
    </StyledWrapper>
  )
}

export default ResponseActions;