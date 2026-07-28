import React, { useEffect, useRef, useState } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { useAppSelector } from '../../store/hooks';
import { useResolvedVariables } from '../../hooks/useVariableResolver';
import { CopyButton } from '../CopyButton/CopyButton';
import { Portal } from '../Portal/Portal';
import { VariableInfoCard } from '../../components/VariableInfoCard/VariableInfoCard';
import { ensureScriptApiCompletions, setModelHints } from './scriptApiCompletions';
import { createVariableDecorator, type VariableDecorator } from './variableDecorations';
import { createVariableHover, type VariableHover } from './variableHoverWidget';
import type { ScriptApiRoot } from '../../utils/scriptAutocomplete';
import { StyledWrapper } from './StyledWrapper';

type EditorInstance = Parameters<OnMount>[0];

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
  /** Bruno API roots to autocomplete in this editor (e.g. `['req', 'bru']`); enables scripting hints. */
  hintsFor?: ScriptApiRoot[];
  /** Show a copy-to-clipboard button (revealed on hover, top-right). Defaults to on. */
  showCopy?: boolean;
  active?: boolean;
  /** Highlight `{{var}}` tokens (green resolved / red unresolved) against the active environment. */
  variableAware?: boolean;
  testId?: string;
}

const LIGHT_THEME = 'oc-light';
const DARK_THEME = 'oc-dark';

const defineThemes = (monaco: Monaco) => {
  monaco.editor.defineTheme(LIGHT_THEME, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#00000000', 'editorGutter.background': '#00000000' }
  });
  monaco.editor.defineTheme(DARK_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#00000000', 'editorGutter.background': '#00000000' }
  });
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'json',
  readOnly = false,
  height = '300px',
  placeholder = '...',
  hintsFor,
  showCopy = true,
  active = true,
  variableAware = false,
  testId
}) => {
  const mode = useAppSelector((s) => s.theme.mode);
  const resolver = useResolvedVariables();
  const editorRef = useRef<EditorInstance | null>(null);
  const decoratorRef = useRef<VariableDecorator | null>(null);
  const hoverRef = useRef<VariableHover | null>(null);
  // Read the latest resolver inside the (non-reactive) decorator via a ref.
  const isFoundRef = useRef(resolver.isFound);
  isFoundRef.current = resolver.isFound;
  // The `{{var}}` token currently hovered in the editor, plus the widget node to portal into.
  const [hoveredVariable, setHoveredVariable] = useState<{ name: string; node: HTMLElement } | null>(null);

  useEffect(() => {
    if (active && editorRef.current) editorRef.current.layout();
  }, [active]);

  // Repaint when the active environment / variable set changes.
  useEffect(() => {
    decoratorRef.current?.refresh();
  }, [resolver]);

  // Tear down the variable decorator + hover widget when the editor unmounts.
  useEffect(
    () => () => {
      decoratorRef.current?.dispose();
      decoratorRef.current = null;
      hoverRef.current?.dispose();
      hoverRef.current = null;
    },
    []
  );

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    if (variableAware) {
      decoratorRef.current = createVariableDecorator(editor, monaco, () => isFoundRef.current);
      hoverRef.current = createVariableHover(editor, monaco, {
        onOpen: (name, node) => setHoveredVariable({ name, node }),
        onClose: () => setHoveredVariable(null)
      });
    }

    const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim();
    if (mono) editor.updateOptions({ fontFamily: mono });

    const runAction = (id: string) => {
      const action = editor.getAction(id);
      if (action) action.run();
    };
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => runAction('editor.foldAll'));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => runAction('editor.action.joinLines'));

    if (!hintsFor?.length) return;
    ensureScriptApiCompletions(monaco);
    const model = editor.getModel();
    if (model) setModelHints(model, hintsFor);
  };

  return (
    <StyledWrapper data-testid={testId} style={{ height }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(next) => onChange(next || '')}
        beforeMount={defineThemes}
        onMount={handleMount}
        theme={mode === 'dark' ? DARK_THEME : LIGHT_THEME}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          fontWeight: 'normal',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          lineNumbers: 'on',
          roundedSelection: false,
          // Don't swallow the wheel when the editor has nothing (more) to scroll — let it bubble to
          // the surrounding pane so hovering a code editor doesn't trap page/drag-select scrolling.
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 5,
            horizontalScrollbarSize: 5,
            alwaysConsumeMouseWheel: false
          },
          wordWrap: 'on',
          folding: true,
          showFoldingControls: 'always',
          stickyScroll: { enabled: false },
          glyphMargin: false,
          lineDecorationsWidth: 12,
          lineNumbersMinChars: 2,
          automaticLayout: true,
          // Render overflow content widgets (the variable hover card) in a fixed-position
          // container so they escape the editor's `overflow: hidden` wrapper and narrow panes
          // instead of being clipped — matching the desktop app's float-above behaviour.
          fixedOverflowWidgets: true,
          placeholder,
          renderLineHighlight: 'none',
          guides: { indentation: false, highlightActiveIndentation: false, bracketPairs: false },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true
        }}
      />
      {showCopy && value ? (
        <CopyButton
          text={value}
          label="Copy code"
          className="code-editor-copy"
          testId={testId ? `${testId}-copy` : undefined}
        />
      ) : null}
      {hoveredVariable ? (
        <Portal container={hoveredVariable.node}>
          <VariableInfoCard name={hoveredVariable.name} editable={!readOnly} />
        </Portal>
      ) : null}
    </StyledWrapper>
  );
};

export default CodeEditor;
