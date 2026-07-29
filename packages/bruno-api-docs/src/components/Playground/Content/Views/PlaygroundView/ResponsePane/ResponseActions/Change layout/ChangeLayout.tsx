import React from 'react';
import ActionIcon from '../../../../../../../../ui/ActionIcon/ActionIcon';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import { useAppDispatch } from '../../../../../../../../store/hooks';
import { setResponsePaneOrientation } from '../../../../../../../../store/slices/playground';

interface ChangeLayoutProps {
  orientation: 'vertical' | 'horizontal';
}

const ChangeLayout: React.FC<ChangeLayoutProps> = ({orientation}) => {
  const dispatch = useAppDispatch();
  const toggleLayout = () => {
    dispatch(setResponsePaneOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal'));
  };

  return (
    <ActionIcon label="Change Layout" className="p-1" onClick={toggleLayout}>
      {orientation === 'vertical' ? (
        <IconLayoutColumns size={16} strokeWidth={2} />
      ) : (
        <IconLayoutRows size={16} strokeWidth={2} />
      )}
    </ActionIcon>
  );
}

export default ChangeLayout;
