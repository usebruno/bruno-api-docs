import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconDownload } from '@tabler/icons';

interface DownloadResponseProps {
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({}) => {
  
  return (
    <ActionIcon label="Download Response" className="p-1">
      <IconDownload size={16} stroke={2} />
    </ActionIcon>
  );
}

export default DownloadResponse;