import React from 'react';
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

  return (
    <StyledWrapper>
      <div className="code-example-section">
        <h3 className="section-title">Example Request</h3>
        <div className="code-example-card">
          <TabGroup
            tabs={[
              { id: 'curl', label: 'cURL' },
              { id: 'javascript', label: 'JavaScript' },
              { id: 'python', label: 'Python' }
            ]}
            defaultTab="curl"
            renderContent={(activeTab: string) => {
              if (activeTab === 'curl') {
                return <CompactCodeView code={generateCurlCommand()} language="bash" />;
              } else if (activeTab === 'javascript') {
                return <CompactCodeView code={generateJavaScriptCode()} language="javascript" />;
              } else {
                return <CompactCodeView code={generatePythonCode()} language="python" />;
              }
            }}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

