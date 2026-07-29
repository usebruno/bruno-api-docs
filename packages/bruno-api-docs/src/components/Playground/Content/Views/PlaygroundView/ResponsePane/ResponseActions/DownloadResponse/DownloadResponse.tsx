import React from 'react';
import ActionIcon from '@/ui/ActionIcon/ActionIcon';
import { IconDownload } from '@tabler/icons';

interface DownloadResponseProps {
  onClick: () => void;
  disabled: boolean;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({ onClick, disabled }) => {
  return (
    <ActionIcon label="Download Response" className="p-1" disabled={disabled} onClick={onClick}>
      <IconDownload size={16} stroke={2} />
    </ActionIcon>
  );
};

export default DownloadResponse;
