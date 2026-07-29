import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconDownload } from '@tabler/icons';
import { RunRequestResponse } from '../../../../../../../../runner';
import { downloadResponse } from '../../../../../../../../utils/downloadResponse';

interface DownloadResponseProps {
  response: RunRequestResponse;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({ response }) => {
  const disabled = !response?.base64Data;
  return (
    <ActionIcon label="Download Response" className="p-1" disabled={disabled} onClick={() => downloadResponse(response)}>
      <IconDownload size={16} stroke={2} />
    </ActionIcon>
  );
}

export default DownloadResponse;
