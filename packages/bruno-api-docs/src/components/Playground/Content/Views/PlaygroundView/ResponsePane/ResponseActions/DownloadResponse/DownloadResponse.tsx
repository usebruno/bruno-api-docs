import React from 'react';
import { IconDownload } from '@tabler/icons';
import IconButton from '@/ui/IconButton/IconButton';

interface DownloadResponseProps {
  onClick: () => void;
  disabled: boolean;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({ onClick, disabled }) => {
  return (
    <IconButton label="Download Response" className="p-1" disabled={disabled} onClick={onClick}>
      <IconDownload size={13} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
    </IconButton>
  );
};

export default DownloadResponse;
