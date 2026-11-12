import React, { useEffect, useMemo, useRef } from 'react';
import PlaygroundHeader from '../../PlaygroundHeader/PlaygroundHeader';
import { useDockResize } from '@usebruno/api-shared/hooks/useDockResize';
import { areaFor, readStored, readStoredNumber, writeStored } from '@usebruno/api-shared/hooks/useStorage';
import type { DockMode } from '@usebruno/api-shared/utils/playgroundDock';
import { StyledWrapper } from './StyledWrapper';

const HEADER_HEIGHT = 52;
const COLLAPSE_EPSILON = 8;
const getDefaultHeight = () => Math.round(window.innerHeight * 0.6);
const HEIGHT_STORAGE_KEY = 'oc-docs:playgroundBottomHeight';
const COLLAPSED_STORAGE_KEY = 'oc-docs:playgroundBottomCollapsed';

const readStoredHeight = () => readStoredNumber(areaFor('session'), HEIGHT_STORAGE_KEY, getDefaultHeight());

interface BottomSheetDockProps {
  dock: DockMode;
  onDockChange: (dock: DockMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClose: () => void;
  openNonce?: number;
  children: React.ReactNode;
}

const BottomSheetDock: React.FC<BottomSheetDockProps> = ({
  dock,
  onDockChange,
  sidebarOpen,
  onToggleSidebar,
  onClose,
  openNonce,
  children
}) => {
  const initialHeight = useMemo(() => {
    const storedCollapsed = readStored<unknown>(areaFor('session'), COLLAPSED_STORAGE_KEY, false) === true;
    return storedCollapsed ? HEADER_HEIGHT : readStoredHeight();
  }, []);
  const { size, dragging, startDrag, setSize } = useDockResize({
    axis: 'y',
    initial: initialHeight,
    min: HEADER_HEIGHT,
    max: () => window.innerHeight
  });

  const collapsed = size <= HEADER_HEIGHT + COLLAPSE_EPSILON;

  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    if (!openNonce) return;
    if (sizeRef.current <= HEADER_HEIGHT + COLLAPSE_EPSILON) setSize(readStoredHeight());
  }, [openNonce, setSize]);

  useEffect(() => {
    if (dragging) return;
    writeStored(areaFor('session'), COLLAPSED_STORAGE_KEY, collapsed);
    if (!collapsed) writeStored(areaFor('session'), HEIGHT_STORAGE_KEY, size);
  }, [dragging, size, collapsed]);

  const toggleCollapse = () => {
    setSize(collapsed ? readStoredHeight() : HEADER_HEIGHT);
  };

  return (
    <StyledWrapper
      style={{ height: `${size}px` }}
      className={dragging ? 'dragging' : ''}
      data-testid="playground-dock-bottom-panel"
    >
      <div
        className="resize-handle"
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={startDrag}
        data-testid="playground-dock-bottom-resizer"
      />
      <PlaygroundHeader
        dock={dock}
        onDockChange={onDockChange}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onClose={onClose}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      {!collapsed && (
        <div className="dock-content" data-testid="playground-content">
          {children}
        </div>
      )}
    </StyledWrapper>
  );
};

export default BottomSheetDock;
