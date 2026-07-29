import React from 'react';
import ActionIcon from '@/ui/ActionIcon/ActionIcon';
import { IconEraser } from '@tabler/icons';

interface ClearResponseProps {
  onClick: () => void;
}

const ClearResponse: React.FC<ClearResponseProps> = ({ onClick }) => {
  return (
    <ActionIcon label="Clear Response" className="p-1" onClick={onClick}>
      <IconEraser size={16} stroke={2} />
    </ActionIcon>
  );
};

export default ClearResponse;
