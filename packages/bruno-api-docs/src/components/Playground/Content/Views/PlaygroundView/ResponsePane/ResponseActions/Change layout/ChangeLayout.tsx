import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';

interface ChangeLayoutProps {
  orientation: 'vertical' | 'horizontal';
  onClick: () => void;
}

const ChangeLayout: React.FC<ChangeLayoutProps> = ({ orientation, onClick }) => {
  return (
    <ActionIcon label="Change Layout" className="p-1" onClick={onClick}>
      {orientation === 'vertical' ? (
        <IconLayoutColumns size={16} strokeWidth={2} />
      ) : (
        <IconLayoutRows size={16} strokeWidth={2} />
      )}
    </ActionIcon>
  );
}

export default ChangeLayout;
