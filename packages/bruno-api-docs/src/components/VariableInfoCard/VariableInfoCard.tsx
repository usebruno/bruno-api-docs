import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useResolvedVariables } from '../../hooks';
import { CopyButton } from '../../ui/CopyButton/CopyButton';
import { SCOPE_LABELS, INVALID_NAME_WARNING } from '../../constants';
import type { VariableScope } from '../../utils/variableResolution';
import { StyledWrapper } from './StyledWrapper';

// Scopes whose values can be inline-edited (mirrors desktop; process.env/runtime/dynamic/
// oauth2/$secrets stay read-only). Global has no playground store, so it is read-only too.
const EDITABLE_SCOPES = new Set<VariableScope>(['environment', 'collection', 'folder', 'request']);

interface VariableInfoCardProps {
  name: string;
  /** Allow inline-editing the value (playground surfaces only; docs stay read-only). */
  editable?: boolean;
  testId?: string;
}

const getReadOnlyNote = (scope: VariableScope, activeEnvName: string | null): string | null => {
  if (scope === 'process.env' || scope === 'oauth2' || scope === '$secrets') return 'read-only';
  if (scope === 'undefined') return activeEnvName ? 'Variable is not defined' : 'No active environment';
  return null;
};

export const VariableInfoCard: React.FC<VariableInfoCardProps> = ({
  name,
  editable = false,
  testId = 'variable-info-card'
}) => {
  const { lookup, activeEnvName, updateVariable } = useResolvedVariables();
  const info = lookup(name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Grow the edit field with its content (the container caps it and scrolls past ~9 lines).
  useLayoutEffect(() => {
    const el = editRef.current;
    if (!editing || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  // Editable for concrete scopes (env/collection/folder/request); read-only scopes and
  // secrets stay read-only. Environment edits need an active environment to target.
  const canEdit =
    editable &&
    info.valid &&
    !info.secret &&
    EDITABLE_SCOPES.has(info.scope) &&
    // Only plain-string values are inline-editable; editing a typed value (object/number/etc)
    // as text would drop its `{ type, data }` shape, so those stay read-only.
    (info.dataType === undefined || info.dataType === 'string') &&
    (info.scope !== 'environment' || !!activeEnvName);

  // Leave edit mode when the hovered token changes (the card instance is reused across tokens).
  useEffect(() => {
    setEditing(false);
  }, [name]);

  const startEditing = () => {
    // Edit the raw stored value (which may contain `{{refs}}`), not the deep-resolved display value.
    setDraft(info.rawValue);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== info.rawValue) updateVariable(info.name, draft);
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const readOnlyNote = getReadOnlyNote(info.scope, activeEnvName);
  const placeholder = info.secret ? '(Secret)' : !canEdit && info.value === '' ? '(empty)' : null;

  const copyIcon = (
    <div className="var-icons">
      <CopyButton
        text={info.value}
        label="Copy value"
        resetAfterMs={1000}
        className="copy-button"
        testId={`${testId}-copy`}
      />
    </div>
  );

  return (
    <StyledWrapper className="variable-info-card" data-testid={testId}>
      {header}
      <div className="var-value-container">
        {placeholder ? (
          <div className="var-value-display var-value-placeholder" data-testid={`${testId}-value`}>
            {placeholder}
          </div>
        ) : canEdit ? (
          editing ? (
            <textarea
              ref={editRef}
              className="var-value-edit"
              data-testid={`${testId}-edit`}
              value={draft}
              autoFocus
              rows={1}
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={commit}
            />
          ) : (
            <>
              <div
                className="var-value-display var-value-editable"
                data-testid={`${testId}-value`}
                role="button"
                tabIndex={0}
                title="Click to edit"
                // mousedown + preventDefault so the display never grabs focus/selection (which
                // flashes a focus ring) before it swaps to the textarea. Keyboard uses onKeyDown.
                onMouseDown={(event) => {
                  event.preventDefault();
                  startEditing();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') startEditing();
                }}
              >
                {info.value === '' ? '(empty)' : info.value}
              </div>
              {copyIcon}
            </>
          )
        ) : (
          <>
            <div className="var-value-display" data-testid={`${testId}-value`}>
              {info.value}
            </div>
            {copyIcon}
          </>
        )}
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
