import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { HOVER_OPEN_MS, HOVER_CLOSE_MS } from '../../constants/ui';
import { templateVariableGlobalRegex } from '../../utils/common';

interface TokenHit {
  name: string;
  lineNumber: number;
  startColumn: number;
}

export interface VariableHoverCallbacks {
  onOpen: (name: string, domNode: HTMLElement) => void;
  onClose: () => void;
}

export interface VariableHover {
  dispose: () => void;
}

const tokenAt = (model: editor.ITextModel, lineNumber: number, column: number): TokenHit | null => {
  const line = model.getLineContent(lineNumber);
  const tokens = templateVariableGlobalRegex();
  for (let match = tokens.exec(line); match; match = tokens.exec(line)) {
    const startColumn = match.index + 1;
    const endColumn = match.index + match[0].length + 1;
    if (column >= startColumn && column < endColumn) {
      const name = match[1].trim();
      return name ? { name, lineNumber, startColumn } : null;
    }
  }
  return null;
};

// Shows the variable card when the pointer rests on a `{{var}}` token in a Monaco editor, via a
// content widget whose DOM node the caller portals the React card into. Open/close are debounced.
export const createVariableHover = (
  editorInstance: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  callbacks: VariableHoverCallbacks
): VariableHover => {
  const node = document.createElement('div');
  node.className = 'variable-hover-widget';

  let current: TokenHit | null = null;
  let visible = false;
  let overCard = false;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const widget: editor.IContentWidget = {
    allowEditorOverflow: true,
    getId: () => 'bruno.variableHover',
    getDomNode: () => node,
    getPosition: () =>
      current
        ? {
            position: { lineNumber: current.lineNumber, column: current.startColumn },
            preference: [
              monaco.editor.ContentWidgetPositionPreference.ABOVE,
              monaco.editor.ContentWidgetPositionPreference.BELOW
            ]
          }
        : null
  };
  editorInstance.addContentWidget(widget);

  const cancelOpen = () => {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  };
  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  // Monaco pins a content widget's top when it lays it out, so a card that grows after the fact —
  // the edit field expanding with its content — would extend down over the token it belongs to.
  // Re-layout on every size change so the anchor is recomputed against the new height.
  const sizeObserver = new ResizeObserver(() => {
    if (visible) editorInstance.layoutContentWidget(widget);
  });
  sizeObserver.observe(node);

  const show = (hit: TokenHit) => {
    current = hit;
    visible = true;
    editorInstance.layoutContentWidget(widget);
    callbacks.onOpen(hit.name, node);
  };

  const hide = () => {
    if (!visible) return;
    visible = false;
    current = null;
    editorInstance.layoutContentWidget(widget);
    callbacks.onClose();
  };

  const scheduleClose = () => {
    cancelOpen();
    if (closeTimer) return;
    closeTimer = setTimeout(() => {
      closeTimer = null;
      // Hold the card open while it has focus so an in-progress edit survives; its own focusout
      // schedules the next close.
      if (overCard || node.contains(document.activeElement)) return;
      hide();
    }, HOVER_CLOSE_MS);
  };

  const moveDisposable = editorInstance.onMouseMove((event) => {
    // Ignore moves while over the card — Monaco fires these even for events over the widget.
    if (overCard) return;
    const position = event.target.position;
    const model = editorInstance.getModel();
    const hit = position && model ? tokenAt(model, position.lineNumber, position.column) : null;

    if (!hit) {
      scheduleClose();
      return;
    }
    cancelClose();
    if (
      visible
      && current
      && current.name === hit.name
      && current.startColumn === hit.startColumn
      && current.lineNumber === hit.lineNumber
    )
      return;
    cancelOpen();
    openTimer = setTimeout(() => {
      openTimer = null;
      show(hit);
    }, HOVER_OPEN_MS);
  });

  const leaveDisposable = editorInstance.onMouseLeave(() => {
    if (!overCard) scheduleClose();
  });

  const onCardEnter = () => {
    overCard = true;
    cancelClose();
  };
  const onCardLeave = () => {
    overCard = false;
    scheduleClose();
  };
  const onCardFocusOut = () => scheduleClose();
  // Stop clicks inside the card from reaching Monaco (which would blur/dismiss it).
  const onCardMouseDown = (event: MouseEvent) => event.stopPropagation();
  node.addEventListener('mouseenter', onCardEnter);
  node.addEventListener('mouseleave', onCardLeave);
  node.addEventListener('focusout', onCardFocusOut);
  node.addEventListener('mousedown', onCardMouseDown);

  return {
    dispose: () => {
      cancelOpen();
      cancelClose();
      sizeObserver.disconnect();
      moveDisposable.dispose();
      leaveDisposable.dispose();
      node.removeEventListener('mouseenter', onCardEnter);
      node.removeEventListener('mouseleave', onCardLeave);
      node.removeEventListener('focusout', onCardFocusOut);
      node.removeEventListener('mousedown', onCardMouseDown);
      editorInstance.removeContentWidget(widget);
    }
  };
};
