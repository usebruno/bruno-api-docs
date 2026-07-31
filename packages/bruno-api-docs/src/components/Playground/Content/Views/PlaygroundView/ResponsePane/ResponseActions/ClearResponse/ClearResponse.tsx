import React from 'react';
import IconButton from '@/ui/IconButton/IconButton';
import { IconEraser } from '@tabler/icons';

interface ClearResponseProps {
  onClick: () => void;
}

const ClearResponse: React.FC<ClearResponseProps> = ({ onClick }) => {
  return (
    <IconButton label="Clear Response" className="p-1" onClick={onClick}>
      <IconEraser size={13} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
    </IconButton>
  );
};

export default ClearResponse;
