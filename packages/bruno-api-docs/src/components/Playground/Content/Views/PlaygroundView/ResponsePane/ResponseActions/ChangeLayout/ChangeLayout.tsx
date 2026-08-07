import React from 'react';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import IconButton from '@/ui/IconButton/IconButton';

interface ChangeLayoutProps {
  orientation: 'vertical' | 'horizontal';
  handleChangeLayout: () => void;
}

const ChangeLayout: React.FC<ChangeLayoutProps> = ({ orientation, handleChangeLayout }) => {
  return (
    <IconButton label="Change Layout" className="p-1" onClick={handleChangeLayout}>
      {orientation === 'vertical' ? (
        <IconLayoutColumns size={13} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      ) : (
        <IconLayoutRows size={13} stroke={1.5} style={{ color: 'var(--text-muted)' }} />
      )}
    </IconButton>
  );
};

export default ChangeLayout;
