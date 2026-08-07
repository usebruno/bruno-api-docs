import React, { useState } from 'react';
import { Code } from '../Code/Code';
import { CopyButton } from '../../ui/CopyButton/CopyButton';
import { useResolvedVariables } from '../../hooks';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { Modal } from '../../ui/Modal/Modal';
import { ExpandIcon } from '../../assets/icons';
import { StyledWrapper } from './StyledWrapper';

export interface Snippet {
  id: string;
  label: string;
  language: string;
  code: string;
}

interface SnippetTabsProps {
  snippets: Snippet[];
  className?: string;
  testId?: string;
}

export const SnippetTabs: React.FC<SnippetTabsProps> = ({ snippets, className, testId = 'request-code-snippet' }) => {
  const [active, setActive] = useState<string>(snippets[0]?.id ?? '');
  const [modalActive, setModalActive] = useState<string>(snippets[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);
  const { showVars, resolve } = useResolvedVariables();

  if (snippets.length === 0) return null;

  const openModal = () => {
    setModalActive(active);
    setExpanded(true);
  };

  const renderSnippetBox = (variant: 'inline' | 'modal', activeId: string, setActiveId: (id: string) => void) => {
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
                data-testid={`code-snippet-tab-${snippet.id}`}
                className={['snippet-tab', activeSnippet.id === snippet.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setActiveId(snippet.id)}
              >
                {snippet.label}
              </button>
            ))}
          </div>
          <span className="snippet-head-spacer" />
          {variant === 'inline' ? (
            <button
              type="button"
              className="code-snippet-expand"
              aria-label="Expand code snippet"
              data-testid="code-snippet-expand"
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
          showCopy={variant === 'inline'}
          variableAware
          copyText={copyText}
          testId="code-snippet-code"
        />
      </div>
    );
  };

  return (
    <StyledWrapper className={['code-snippet-tabs', className].filter(Boolean).join(' ')} data-testid={testId}>
      {renderSnippetBox('inline', active, setActive)}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={<SectionLabel>Code snippet</SectionLabel>}
        ariaLabel="Code snippet"
      >
        {expanded && (
          <StyledWrapper className="code-snippet-tabs is-modal" data-testid="code-snippet-modal">
            {renderSnippetBox('modal', modalActive, setModalActive)}
          </StyledWrapper>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default SnippetTabs;
