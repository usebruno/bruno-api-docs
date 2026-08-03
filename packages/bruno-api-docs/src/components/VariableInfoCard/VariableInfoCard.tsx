import React, { useLayoutEffect, useRef, useState } from 'react';
import { useResolvedVariables } from '@/hooks';
import { CopyButton } from '@/ui/CopyButton/CopyButton';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';
import { SCOPE_LABELS, INVALID_NAME_WARNING } from '@/constants';
import type { VariableScope } from '@/utils/variableResolution';
import { StyledWrapper } from './StyledWrapper';

const EDITABLE_SCOPES = new Set<VariableScope>(['environment', 'collection', 'folder', 'request', '$secrets']);

/** These scopes read their values from the active environment, so one must be selected to edit them. */
const ENV_BOUND_SCOPES = new Set<VariableScope>(['environment', '$secrets']);

interface VariableInfoCardProps {
  name: string;
  editable?: boolean;
  testId?: string;
}

/**
 * The `$secrets` scope covers two different things. A literal `{{$secrets.x}}`
 * reference points at a secrets provider that a browser cannot reach, so it is
 * read-only. An external secret declared on the environment can be filled in
 * from the playground, so it is not. `canEdit` is what tells them apart.
 */
const getReadOnlyNote = (scope: VariableScope, activeEnvName: string | null, canEdit: boolean): string | null => {
  if (scope === 'process.env' || scope === 'oauth2') return 'read-only';
  if (scope === '$secrets' && !canEdit) return 'read-only';
  if (scope === 'undefined') return activeEnvName ? 'Variable is not defined' : 'No active environment';
  return null;
};

/** One asterisk per character, keeping line breaks so a multi-line value still looks multi-line. */
const maskValue = (value: string): string => value.replace(/[^\n]/g, '*');

export const VariableInfoCard: React.FC<VariableInfoCardProps> = ({
  name,
  editable = false,
  testId = 'variable-info-card'
}) => {
  const { lookup, activeEnvName, updateVariable, canWrite } = useResolvedVariables();
  const info = lookup(name);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  // Where the caret should sit after the next render, or null to leave it alone.
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = editRef.current;
    if (!editing || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  // Setting a textarea's value moves the caret to the end, so any position we
  // want to keep has to be reapplied once React has written the new value.
  useLayoutEffect(() => {
    const el = editRef.current;
    const caret = caretRef.current;
    if (!el || caret === null) return;
    caretRef.current = null;
    el.setSelectionRange(caret, caret);
  }, [editing, draft]);

  const canEdit
    = editable
      && canWrite
      && info.valid
      && info.simpleString
      && EDITABLE_SCOPES.has(info.scope)
      && (!ENV_BOUND_SCOPES.has(info.scope) || !!activeEnvName);

  // Secrets are only fillable in the playground. The rendered docs show the
  // original "(Secret)" placeholder with no mask, reveal or copy.
  const secretFillable = editable && info.secret;
  const masked = secretFillable && !revealed;
  const displayValue = masked ? maskValue(info.value) : info.value;
  // A variable can be secret because it *is* one, or because its value mentions
  // one. In the second case the raw value is a template such as
  // `Bearer {{token}}`, which holds nothing sensitive, so it is edited in plain
  // text rather than masked.
  const maskWhileEditing = masked && info.rawValue === info.value;
  const editValue = maskWhileEditing ? maskValue(draft) : draft;

  const startEditing = () => {
    setDraft(info.rawValue);
    caretRef.current = info.rawValue.length;
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== info.rawValue) updateVariable(info.name, draft);
  };

  const rememberSelection = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    selectionRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
  };

  /**
   * While masked, the field contains asterisks rather than the secret, so an
   * edit has to be translated back onto the real string. There is one asterisk
   * per character, so a position in the field is the same position in the value.
   *
   * The edited range runs from wherever the change began to wherever the caret
   * ended up. Reading it from the caret afterwards, rather than from the
   * selection beforehand, is what makes Backspace and Delete work: they remove a
   * character next to an empty selection, which the selection alone cannot
   * describe.
   */
  const handleEditChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = event.target;
    const next = el.value;
    if (!maskWhileEditing) {
      setDraft(next);
      return;
    }

    const caret = el.selectionStart ?? 0;
    const from = Math.min(selectionRef.current.start, caret);
    const inserted = next.slice(from, caret);
    const removedCount = draft.length - (next.length - inserted.length);
    caretRef.current = caret;
    setDraft(draft.slice(0, from) + inserted + draft.slice(from + removedCount));
  };

  /**
   * Copying out of a masked field would otherwise put asterisks on the
   * clipboard. Because a position in the field is the same position in the
   * value, the selected range can be taken from the real string instead.
   */
  const writeSelectionToClipboard = (event: React.ClipboardEvent<HTMLTextAreaElement>): [number, number] | null => {
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (!maskWhileEditing || start === end) return null;
    event.preventDefault();
    event.clipboardData.setData('text/plain', draft.slice(start, end));
    return [start, end];
  };

  const handleEditCut = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const range = writeSelectionToClipboard(event);
    if (!range) return;
    const [start, end] = range;
    caretRef.current = start;
    setDraft(draft.slice(0, start) + draft.slice(end));
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    rememberSelection(event);
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditing(false);
    }
  };

  const header = (
    <div className="var-info-header">
      <span className="var-name" data-testid={`${testId}-name`}>
        {info.name}
      </span>
      <span className="var-scope-badge" data-testid={`${testId}-scope`}>
        {SCOPE_LABELS[info.scope]}
      </span>
    </div>
  );

  if (!info.valid) {
    return (
      <StyledWrapper className="variable-info-card" data-testid={testId}>
        {header}
        <div className="var-warning-note" data-testid={`${testId}-warning`}>
          {INVALID_NAME_WARNING}
        </div>
      </StyledWrapper>
    );
  }

  if (info.scope === 'dynamic') {
    if (info.dynamicKind === 'unknown') {
      return (
        <StyledWrapper className="variable-info-card" data-testid={testId}>
          {header}
          <div className="var-warning-note" data-testid={`${testId}-warning`}>
            {`Unknown dynamic variable "${info.name}". Check the variable name.`}
          </div>
        </StyledWrapper>
      );
    }
    return (
      <StyledWrapper className="variable-info-card" data-testid={testId}>
        {header}
        <div className="var-readonly-note" data-testid={`${testId}-note`}>
          {info.dynamicKind === 'time'
            ? 'Generates current timestamp on each request'
            : 'Generates random value on each request'}
        </div>
      </StyledWrapper>
    );
  }

  const readOnlyNote = getReadOnlyNote(info.scope, activeEnvName, canEdit);
  const emptyLabel = !secretFillable && info.value === '' ? '(empty)' : null;
  const placeholder = info.secret && !editable ? '(Secret)' : canEdit ? null : emptyLabel;

  // The playground always offers copy, matching the app, even with nothing yet to
  // copy. The docs keep their original rule: a value, and never for a secret.
  const showCopy = editable || (info.value !== '' && !info.secret);

  const icons = showCopy && (
    <div className="var-icons">
      {secretFillable && (
        <button
          type="button"
          className="reveal-button"
          aria-label={revealed ? 'Hide value' : 'Show value'}
          aria-pressed={revealed}
          data-testid={`${testId}-reveal`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setRevealed((previous) => !previous)}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
      {showCopy && (
        <CopyButton
          text={info.value}
          label="Copy value"
          resetAfterMs={1000}
          className="copy-button"
          testId={`${testId}-copy`}
        />
      )}
    </div>
  );

  const placeholderNode = (
    <div className="var-value-display var-value-placeholder" data-testid={`${testId}-value`}>
      {placeholder}
    </div>
  );

  const editFieldNode = (
    <textarea
      ref={editRef}
      className="var-value-edit"
      data-testid={`${testId}-edit`}
      aria-label={`Edit ${info.name}`}
      value={editValue}
      autoFocus
      rows={1}
      spellCheck={false}
      autoComplete="off"
      onChange={handleEditChange}
      onKeyDown={handleEditKeyDown}
      onSelect={rememberSelection}
      onCopy={writeSelectionToClipboard}
      onCut={handleEditCut}
      onBlur={commit}
    />
  );

  const editableDisplayNode = (
    <div
      className="var-value-display var-value-editable"
      data-testid={`${testId}-value`}
      role="button"
      tabIndex={0}
      title="Click to edit"
      onMouseDown={(event) => {
        event.preventDefault();
        startEditing();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        startEditing();
      }}
    >
      {emptyLabel ?? displayValue}
    </div>
  );

  const readOnlyDisplayNode = (
    <div className="var-value-display" data-testid={`${testId}-value`}>
      {displayValue}
    </div>
  );

  const editableNode = editing ? editFieldNode : editableDisplayNode;
  const valueNode = placeholder ? placeholderNode : canEdit ? editableNode : readOnlyDisplayNode;

  return (
    <StyledWrapper className="variable-info-card" data-testid={testId}>
      {header}
      <div className="var-value-container">
        {valueNode}
        {icons}
      </div>
      {readOnlyNote && (
        <div className="var-readonly-note" data-testid={`${testId}-note`}>
          {readOnlyNote}
        </div>
      )}
    </StyledWrapper>
  );
};

export default VariableInfoCard;
