import React, { useState } from 'react';
import { TabGroup, CompactCodeView } from '../../../ui/MinimalComponents';
import { StyledWrapper } from './StyledWrapper';
import { generateCurlCommand, generateJavaScriptCode, generatePythonCode } from './generateCodeSnippets';

interface CodeSnippetsProps {
  method: string;
  url: string;
  headers?: Array<{ name: string; value: string; disabled?: boolean }>;
  body?: { type?: string; data?: string };
}

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({
  method,
  url,
  headers = [],
  body
}) => {
  const snippetInput = { method, url, headers, body };

  const tabDefinitions = [
    {
      id: 'curl',
      label: 'cURL',
      code: generateCurlCommand(snippetInput),
      language: 'bash',
    },
    {
      id: 'javascript',
      label: 'JavaScript',
      code: generateJavaScriptCode(snippetInput),
      language: 'javascript',
    },
    {
      id: 'python',
      label: 'Python',
      code: generatePythonCode(snippetInput),
      language: 'python',
    },
  ];

  return (
    <StyledWrapper>
      <div className="code-example-section">
        <h3 className="section-title">Code Snippet</h3>
        <div className="code-example-card">
          <TabGroup
            tabs={tabDefinitions.map(({ id, label }) => ({ id, label }))}
            defaultTab="curl"
            renderContent={(activeTab: string) => {
              const tab =
                tabDefinitions.find(({ id }) => id === activeTab) ??
                tabDefinitions[0];

              return (
                <ExampleCodeContent
                  code={tab?.code || ''}
                  language={tab?.language || 'text'}
                />
              );
            }}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

const ExampleCodeContent: React.FC<{ code: string; language: string }> = ({
  code,
  language
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy code snippet', error);
      }
    }
  };

  return (
    <div className="code-example-code-wrapper">
      <CompactCodeView
        copyButton={false}
        code={code}
        language={language}
      />
      <button
        className={`code-copy-button${copied ? ' copied' : ''}`}
        onClick={handleCopy}
        aria-label={copied ? 'Code copied' : 'Copy code'}
        type="button"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
};

