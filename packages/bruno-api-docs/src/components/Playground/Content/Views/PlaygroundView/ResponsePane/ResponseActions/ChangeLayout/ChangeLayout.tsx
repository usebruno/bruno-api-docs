import React from 'react';
import ActionIconButton from '../ActionIconButton/ActionIconButton';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';

interface ChangeLayoutProps {
  orientation: 'vertical' | 'horizontal';
  handleChangeLayout: () => void;
}

const ChangeLayout: React.FC<ChangeLayoutProps> = ({ orientation, handleChangeLayout }) => {
  return (
    <ActionIconButton label="Change Layout" className="p-1" onClick={handleChangeLayout}>
      {orientation === 'vertical' ? (
        <IconLayoutColumns size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      ) : (
        <IconLayoutRows size={16} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      )}
    </ActionIconButton>
  );
};

export default ChangeLayout;
