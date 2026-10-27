import React, { useEffect, useMemo } from 'react';
import PlaygroundHeader from '../../PlaygroundHeader/PlaygroundHeader';
import { useDockResize } from '@/hooks/useDockResize';
import { areaFor, readStoredNumber, writeStored } from '@/hooks/useStorage';
import type { DockMode } from '@/utils/playgroundDock';
import { StyledWrapper } from './StyledWrapper';

const WIDTH_STORAGE_KEY = 'oc-docs:playgroundInlineWidth';
const SSR_VIEWPORT_WIDTH = 1024;

const getViewportWidth = () => (typeof window !== 'undefined' ? window.innerWidth : SSR_VIEWPORT_WIDTH);

interface InlineDockProps {
  dock: DockMode;
  onDockChange: (dock: DockMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const InlineDock: React.FC<InlineDockProps> = ({ dock, onDockChange, sidebarOpen, onToggleSidebar, onClose, children }) => {
  const initialWidth = useMemo(
    () => readStoredNumber(areaFor('session'), WIDTH_STORAGE_KEY, Math.round(getViewportWidth() * 0.4)),
    []
  );
  const { size, dragging, startDrag } = useDockResize({
    axis: 'x',
    initial: initialWidth,
    min: 360,
    max: () => Math.round(getViewportWidth() * 0.7)
  });

  useEffect(() => {
    if (!dragging) writeStored(areaFor('session'), WIDTH_STORAGE_KEY, size);
  }, [dragging, size]);

  return (
    <StyledWrapper
      style={{ width: `${size}px` }}
      className={dragging ? 'dragging' : ''}
      data-testid="playground-dock-inline-panel"
    >
      <div
        className="resize-handle"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startDrag}
        data-testid="playground-dock-inline-resizer"
      />
      <div className="dock-body">
        <PlaygroundHeader
          dock={dock}
          onDockChange={onDockChange}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar}
          onClose={onClose}
        />
        <div className="dock-content" data-testid="playground-content">
          {children}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default InlineDock;
