import React from 'react';
import IconButton from '@/ui/IconButton/IconButton';
import { IconEraser } from '@tabler/icons';
import ActionIconButton from '../ActionIconButton/ActionIconButton';

interface ClearResponseProps {
  onClick: () => void;
}

const ClearResponse: React.FC<ClearResponseProps> = ({ onClick }) => {
  return (
    <ActionIconButton label="Clear Response" className="p-1" onClick={onClick}>
      <IconEraser size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
    </ActionIconButton>
  );
};

export default ClearResponse;
