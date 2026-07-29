import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconEraser } from '@tabler/icons';
import { useAppDispatch } from '../../../../../../../../store/hooks';
import { clearPlaygroundResponse } from '../../../../../../../../store/slices/playground';

interface ClearResponseProps {
  itemUuid: string;
}

const ClearResponse: React.FC<ClearResponseProps> = ({ itemUuid }) => {
  const dispatch = useAppDispatch();
  return (
    <ActionIcon label="Clear Response" className="p-1" onClick={() => dispatch(clearPlaygroundResponse(itemUuid))}>
      <IconEraser size={16} stroke={2} />
    </ActionIcon>
  );
}

export default ClearResponse;
