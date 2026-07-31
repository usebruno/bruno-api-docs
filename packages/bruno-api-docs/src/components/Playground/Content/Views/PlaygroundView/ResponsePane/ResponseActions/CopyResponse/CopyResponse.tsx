import React from 'react';
import { IconCheck, IconCopy } from '@tabler/icons';
import IconButton from '@/ui/IconButton/IconButton';

interface CopyResponseProps {
  copied: boolean;
  onClick: () => void;
  disabled: boolean;
}

const CopyResponse: React.FC<CopyResponseProps> = ({ copied, onClick, disabled }) => {
  return (
    <IconButton label="Copy Response" className="p-1" disabled={disabled} onClick={onClick}>
      {copied ? <IconCheck size={13} strokeWidth={1} /> : <IconCopy size={13} strokeWidth={1} />}
    </IconButton>
  );
};

export default CopyResponse;
