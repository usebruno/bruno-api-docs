import React from 'react';
import { IconCheck, IconCopy } from '@tabler/icons';
import ActionIconButton from '../ActionIconButton/ActionIconButton';

interface CopyResponseProps {
  copied: boolean;
  onClick: () => void;
  disabled: boolean;
}

const CopyResponse: React.FC<CopyResponseProps> = ({ copied, onClick, disabled }) => {
  return (
    <ActionIconButton label="Copy Response" className="p-1" disabled={disabled} onClick={onClick}>
      {copied ? (
        <IconCheck size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      ) : (
        <IconCopy size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      )}
    </ActionIconButton>
  );
};

export default CopyResponse;
