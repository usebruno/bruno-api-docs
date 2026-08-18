import React from 'react';
import IconButton from '@/ui/IconButton/IconButton';
import { IconDownload } from '@tabler/icons';
import ActionIconButton from '../ActionIconButton/ActionIconButton';

interface DownloadResponseProps {
  onClick: () => void;
  disabled: boolean;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({ onClick, disabled }) => {
  return (
    <ActionIconButton label="Download Response" className="p-1" disabled={disabled} onClick={onClick}>
      <IconDownload size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
    </ActionIconButton>
  );
};

export default DownloadResponse;
