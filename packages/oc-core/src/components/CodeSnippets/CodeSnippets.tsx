import React, { useState } from 'react';
import { TabGroup, CompactCodeView } from '../../ui/MinimalComponents';
import { StyledWrapper } from './StyledWrapper';

interface CodeSnippetsProps {
  method: string;
  url: string;
  headers?: Array<{ name: string; value: string; enabled?: boolean }>;
  body?: { mode?: string; type?: string; data?: string } | any;
}

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({
  method,
  url,
  headers = [],
  body
}) => {
  const generateCurlCommand = () => {
    const enabledHeaders = headers?.filter((h: any) => h.enabled !== false)
      .map((h: any) => `-H "${h.name}: ${h.value}"`).join(" \\\n  ") || '';
    
    let bodyData = '';
    if (body && typeof body === 'object' && 'data' in body) {
      const rawBody = body as any;
      if (rawBody.type === 'json' && rawBody.data) {
        bodyData = ` \\\n  -d '${rawBody.data}'`;
      }
    }

    return `curl -X ${method} "${url}"${enabledHeaders ? ` \\\n  ${enabledHeaders}` : ''}${bodyData}`;
  };

  const generateJavaScriptCode = () => {
    const enabledHeaders = headers?.filter((h: any) => h.enabled !== false) || [];
    const headersString = enabledHeaders.map((h: any) => `    "${h.name}": "${h.value}"`).join(',\n');
    const bodyString = body && typeof body === 'object' && 'data' in body 
      ? `,\n  body: JSON.stringify(${(body as any).data || '{}'})` 
      : '';

    return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
${headersString}
  }${bodyString}
});

const data = await response.json();`;
  };

  const generatePythonCode = () => {
    const enabledHeaders = headers?.filter((h: any) => h.enabled !== false) || [];
    const headersString = enabledHeaders.map((h: any) => `        "${h.name}": "${h.value}"`).join(',\n');
    const bodyString = body && typeof body === 'object' && 'data' in body 
      ? `,\n    json=${(body as any).data || '{}'}` 
      : '';

    return `import requests

response = requests.${method.toLowerCase()}(
    "${url}",
    headers={
${headersString}
    }${bodyString}
)

data = response.json()`;
  };

  const tabDefinitions = [
    {
      id: 'curl',
      label: 'cURL',
      code: generateCurlCommand(),
      language: 'bash',
    },
    {
      id: 'javascript',
      label: 'JavaScript',
      code: generateJavaScriptCode(),
      language: 'javascript',
    },
    {
      id: 'python',
      label: 'Python',
      code: generatePythonCode(),
      language: 'python',
    },
  ];

  return (
    <StyledWrapper>
      <div className="code-example-section">
        <h3 className="section-title">Example Request</h3>
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

