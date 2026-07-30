import React from 'react';
import IconButton from '@/ui/IconButton/IconButton';
import { IconDownload } from '@tabler/icons';

interface DownloadResponseProps {
  onClick: () => void;
  disabled: boolean;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({ onClick, disabled }) => {
  return (
    <IconButton label="Download Response" className="p-1" disabled={disabled} onClick={onClick}>
      <IconDownload size={16} stroke={2} />
    </IconButton>
  );
};

export default DownloadResponse;
