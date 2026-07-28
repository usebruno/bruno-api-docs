import React from 'react';
import {IconCheck, IconCopy} from '@tabler/icons';
import { cx } from '../../../../../../../../utils/cx';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';

interface CopyResponseProps {
}

const CopyResponse: React.FC<CopyResponseProps> = ({}) => {
  const disabled = false;
  return (
    <ActionIcon label="Copy Response" className="p-1" disabled={disabled}>
      <IconCopy size={16} stroke={2} />
    </ActionIcon>
  );
}

export default CopyResponse;