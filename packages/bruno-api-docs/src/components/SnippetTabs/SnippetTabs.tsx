import React, { useRef, useState } from 'react';
import { IconCode } from '@tabler/icons';
import cx from '@/utils/cx';
import { Code } from '../Code/Code';
import { CopyButton } from '@/ui/CopyButton/CopyButton';
import { useResolvedVariables } from '@/hooks';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { Modal } from '@/ui/Modal/Modal';
import { ExpandIcon } from '@/assets/icons';
import { StyledWrapper } from './StyledWrapper';

export interface Snippet {
  id: string;
  label: string;
  language: string;
  code: string;
}

interface SnippetTabsProps {
  snippets: Snippet[];
  variant?: 'inline' | 'embedded';
  className?: string;
  testId?: string;
}

export const SnippetTabs: React.FC<SnippetTabsProps> = ({
  snippets,
  variant = 'inline',
  className,
  testId = 'request-code-snippet'
}) => {
  const [active, setActive] = useState<string>(snippets[0]?.id ?? '');
  const [activeModalId, setActiveModalId] = useState<string>(snippets[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { showVars, resolve } = useResolvedVariables();

  if (snippets.length === 0) return null;

  const openModal = () => {
    setActiveModalId(active);
    setExpanded(true);
  };

  const closeModal = () => {
    setExpanded(false);
    triggerRef.current?.focus();
  };

  const renderSnippetBox = (placement: 'inline' | 'modal', activeId: string, setActiveId: (id: string) => void) => {
    const activeSnippet = snippets.find((snippet) => snippet.id === activeId) ?? snippets[0];
    const code = activeSnippet.code;
    const copyText = showVars ? resolve(code) : code;
    return (
      <div className="snippet-box">
        <div className="snippet-head">
          <div className="snippet-tabs" role="tablist" aria-label="Snippet language">
            {snippets.map((snippet) => (
              <button
                key={snippet.id}
                type="button"
                role="tab"
                aria-selected={activeSnippet.id === snippet.id}
                data-testid={`${testId}-tab-${snippet.id}`}
                className={cx('snippet-tab', { 'is-active': activeSnippet.id === snippet.id })}
                onClick={() => setActiveId(snippet.id)}
              >
                {snippet.label}
              </button>
            ))}
          </div>
          <span className="snippet-head-spacer" />
          {placement === 'inline' ? (
            <button
              ref={triggerRef}
              type="button"
              className="code-snippet-expand"
              aria-label="Expand code snippet"
              data-testid={`${testId}-expand`}
              onClick={openModal}
            >
              <ExpandIcon />
            </button>
          ) : (
            <CopyButton text={copyText} label="Copy code" className="snippet-copy" />
          )}
        </div>
        <Code
          code={code}
          language={activeSnippet.language}
          showLineNumbers
          showCopy={placement === 'inline'}
          variableAware
          copyText={copyText}
          testId={`${testId}-code`}
        />
      </div>
    );
  };

  return (
    <StyledWrapper className={cx('code-snippet-tabs', className)} data-testid={testId}>
      {variant === 'inline' ? (
        renderSnippetBox('inline', active, setActive)
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="snippet-trigger"
          aria-haspopup="dialog"
          data-testid={`${testId}-trigger`}
          onClick={openModal}
        >
          <IconCode size={16} stroke={1.5} />
          Code Snippet
        </button>
      )}
      <Modal
        open={expanded}
        onClose={closeModal}
        title={<SectionLabel>Code snippet</SectionLabel>}
        ariaLabel="Code snippet"
      >
        {expanded && (
          <StyledWrapper className="code-snippet-tabs is-modal" data-testid={`${testId}-modal`}>
            {renderSnippetBox('modal', activeModalId, setActiveModalId)}
          </StyledWrapper>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default SnippetTabs;
