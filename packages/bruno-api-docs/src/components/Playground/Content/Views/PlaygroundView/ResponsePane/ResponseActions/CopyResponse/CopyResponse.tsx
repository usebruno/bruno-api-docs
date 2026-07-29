import React from 'react';
import { IconCheck, IconCopy } from '@tabler/icons';
import ActionIcon from '@/ui/ActionIcon/ActionIcon';

interface CopyResponseProps {
  copied: boolean;
  onClick: () => void;
  disabled: boolean;
}

const CopyResponse: React.FC<CopyResponseProps> = ({ copied, onClick, disabled }) => {
  return (
    <ActionIcon label="Copy Response" className="p-1" disabled={disabled} onClick={onClick}>
      {copied ? <IconCheck size={16} stroke={2} /> : <IconCopy size={16} stroke={2} />}
    </ActionIcon>
  );
};

export default CopyResponse;
