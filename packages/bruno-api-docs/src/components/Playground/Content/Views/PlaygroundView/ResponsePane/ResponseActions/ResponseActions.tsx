import React from 'react';
import CopyResponse from './CopyResponse/CopyResponse';
import ClearResponse from './ClearResponse/ClearResponse';
import DownloadResponse from './DownloadResponse/DownloadResponse';
import ChangeLayout from './Change layout/ChangeLayout';
import { StyledWrapper } from './StyledWrapper';
import { RunRequestResponse } from '../../../../../../../runner';
import { ResponseBodyFormat } from '../../../../../../../constants';

interface ResponseActionsProps {
  orientation: 'vertical' | 'horizontal';
  itemUuid: string;
  response: RunRequestResponse;
  selectedFormat: ResponseBodyFormat;
  showPreview: boolean;
}

const ResponseActions: React.FC<ResponseActionsProps> = ({ orientation, itemUuid, response, selectedFormat, showPreview }) => {
  return (
    <StyledWrapper className="response-pane-actions-wrapper">
      <CopyResponse response={response} selectedFormat={selectedFormat} showPreview={showPreview} />
      <DownloadResponse response={response} />
      <ClearResponse itemUuid={itemUuid} />
      <ChangeLayout orientation={orientation} />
    </StyledWrapper>
  )
}

export default ResponseActions;
