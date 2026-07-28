import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconEraser } from '@tabler/icons';

interface ClearResponseProps {
}

const ClearResponse: React.FC<ClearResponseProps> = ({}) => {
  return (
    <ActionIcon label="Clear Response" className="p-1">
      <IconEraser size={16} stroke={2} />
    </ActionIcon>
  );
}

export default ClearResponse;