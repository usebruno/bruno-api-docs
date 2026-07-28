import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';

interface ChangeLayoutProps {
  orientation: 'vertical' | 'horizontal';
}

const ChangeLayout: React.FC<ChangeLayoutProps> = ({orientation}) => {
  return (
    <ActionIcon label="Change Layout" className="p-1">
      {orientation === 'vertical' ? (
        <IconLayoutColumns size={16} strokeWidth={2} />
      ) : (
        <IconLayoutRows size={16} strokeWidth={2} />
      )}
    </ActionIcon>
  );
}

export default ChangeLayout;