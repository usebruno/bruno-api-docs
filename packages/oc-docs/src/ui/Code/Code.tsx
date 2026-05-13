import React, { useEffect, useRef, useState } from 'react';
import { StyledWrapper } from './StyledWrapper';

import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-xml-doc';

interface CodeProps {
  code?: string;
  language?: string;
}

export const Code: React.FC<CodeProps> = ({
  code,
  language = 'text'
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightAllUnder(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <StyledWrapper className="code-content-wrapper overflow-hidden">
      <div className="relative">
        <button className="code-copy-floating" onClick={handleCopy}>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
        <div className="code-content p-4 overflow-x-auto">
          <pre ref={codeRef} className="m-0">
            <code className={`language-${language} font-mono`}>
              {code || ''}
            </code>
          </pre>
        </div>
      </div>
    </StyledWrapper>
  );
};