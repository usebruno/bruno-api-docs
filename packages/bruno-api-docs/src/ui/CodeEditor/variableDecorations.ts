import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { classifyVariableToken } from '../../utils/variableHighlight';

const TOKEN_REGEX = /\{\{[^}]+\}\}/g;

export interface VariableDecorator {
  /** Re-scan the model and repaint. Call after the active variable set changes. */
  refresh: () => void;
  /** Remove decorations and detach the change listener. */
  dispose: () => void;
}

/**
 * Paints `{{var}}` tokens in a Monaco editor with Bruno's variable-validity
 * classes (`variable-valid` green / `variable-invalid` red / `variable-prompt`),
 * mirroring the desktop app and the single-line `HighlightedInput`.
 *
 * `getIsFound` is read fresh on every paint (not captured once), so switching the
 * active environment re-classifies tokens once `refresh()` is called.
 */
export const createVariableDecorator = (
  editorInstance: editor.IStandaloneCodeEditor,
  monaco: Monaco,
  getIsFound: () => (name: string) => boolean
): VariableDecorator => {
  const collection = editorInstance.createDecorationsCollection();

  const refresh = () => {
    const model = editorInstance.getModel();
    if (!model) return;
    const text = model.getValue();
    const isFound = getIsFound();
    const decorations: editor.IModelDeltaDecoration[] = [];
    TOKEN_REGEX.lastIndex = 0;
    for (let match = TOKEN_REGEX.exec(text); match; match = TOKEN_REGEX.exec(text)) {
      const inner = match[0].slice(2, -2);
      const start = model.getPositionAt(match.index);
      const end = model.getPositionAt(match.index + match[0].length);
      decorations.push({
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { inlineClassName: classifyVariableToken(inner, isFound) }
      });
    }
    collection.set(decorations);
  };

  const changeListener = editorInstance.onDidChangeModelContent(refresh);
  refresh();

  return {
    refresh,
    dispose: () => {
      changeListener.dispose();
      collection.clear();
    }
  };
};
