import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { HOVER_OPEN_MS, HOVER_CLOSE_MS } from '../../constants/ui';

const TOKEN_REGEX = /\{\{[^}]+\}\}/g;

interface TokenHit {
  name: string;
  lineNumber: number;
  /** 1-based column of the token's first `{`. */
  startColumn: number;
}

export interface VariableHoverCallbacks {
  /** A `{{var}}` came under the pointer; render the card into `domNode`. */
  onOpen: (name: string, domNode: HTMLElement) => void;
  /** The card should be torn down. */
  onClose: () => void;
}

export interface VariableHover {
  dispose: () => void;
}

/** Find the `{{var}}` token spanning `column` (1-based) on the given line, if any. */
const tokenAt = (model: editor.ITextModel, lineNumber: number, column: number): TokenHit | null => {
  const line = model.getLineContent(lineNumber);
  TOKEN_REGEX.lastIndex = 0;
  for (let match = TOKEN_REGEX.exec(line); match; match = TOKEN_REGEX.exec(line)) {
    const startColumn = match.index + 1;
    const endColumn = match.index + match[0].length + 1;
    if (column >= startColumn && column < endColumn) {
      const name = match[0].slice(2, -2).trim();
      return name ? { name, lineNumber, startColumn } : null;
    }
  }
  return null;
};

/**
 * Shows the variable info card when the pointer rests on a `{{var}}` token in a
 * Monaco editor — the desktop `brunoVarInfo.js` behaviour, expressed as a Monaco
 * content widget. The widget only provides a positioned DOM node; the caller
 * portals the React card into it (via `onOpen`) so it keeps the resolver/redux
 * context. Open/close are debounced so brushing past a token doesn't flicker, and
 * the card stays open while the pointer is over it.
 */
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
      if (!overCard) hide();
    }, HOVER_CLOSE_MS);
  };

  const moveDisposable = editorInstance.onMouseMove((event) => {
    // While the pointer is over the card, ignore editor mouse-move entirely — Monaco fires
    // these even for events physically over the (overflow) widget, which would otherwise
    // steal focus to another token or close the card mid-interaction.
    if (overCard) return;
    const position = event.target.position;
    const model = editorInstance.getModel();
    const hit = position && model ? tokenAt(model, position.lineNumber, position.column) : null;

    if (!hit) {
      cancelOpen();
      if (!overCard) scheduleClose();
      return;
    }
    cancelClose();
    if (
      visible &&
      current &&
      current.name === hit.name &&
      current.startColumn === hit.startColumn &&
      current.lineNumber === hit.lineNumber
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
  // Keep clicks inside the card from reaching Monaco (which would move the caret / blur the
  // widget and dismiss the card before the click registers on the editable value).
  const onCardMouseDown = (event: MouseEvent) => event.stopPropagation();
  node.addEventListener('mouseenter', onCardEnter);
  node.addEventListener('mouseleave', onCardLeave);
  node.addEventListener('mousedown', onCardMouseDown);

  return {
    dispose: () => {
      cancelOpen();
      cancelClose();
      moveDisposable.dispose();
      leaveDisposable.dispose();
      node.removeEventListener('mouseenter', onCardEnter);
      node.removeEventListener('mouseleave', onCardLeave);
      node.removeEventListener('mousedown', onCardMouseDown);
      editorInstance.removeContentWidget(widget);
    }
  };
};
