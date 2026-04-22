import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { HttpRequestExample } from '@opencollection/types/requests/http';
import StyledWrapper from './StyledWrapper';
import { generateCurlCommand, generateJavaScriptCode, generatePythonCode } from '../../../CodeSnippets/generateCodeSnippets';

interface ExamplesProps {
  examples: HttpRequestExample[];
  method?: string;
  url?: string;
}

const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  if (status >= 500) return 'server-error';
  return '';
};

export const Examples: React.FC<ExamplesProps> = ({ examples, method = 'GET', url = '' }) => {
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [requestTab, setRequestTab] = useState<'body' | 'headers' | 'params'>('body');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState<string | null>(null);
  const [bodyCopied, setBodyCopied] = useState<'request' | 'response' | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCopyMenu(false);
      }
    };

    if (showCopyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCopyMenu]);

  // Filter to examples that have either request or response data
  const validExamples = useMemo(() =>
    examples.filter(ex => ex.request?.body || ex.request?.headers?.length || ex.response),
    [examples]
  );

  if (validExamples.length === 0) return null;

  const activeExample = validExamples[activeExampleIndex];
  const hasRequestBody = !!activeExample?.request?.body;
  const hasRequestHeaders = activeExample?.request?.headers && activeExample.request.headers.length > 0;
  const hasRequestParams = activeExample?.request?.params && activeExample.request.params.length > 0;
  const hasRequest = hasRequestBody || hasRequestHeaders || hasRequestParams;
  const hasResponse = !!activeExample?.response;
  const hasResponseHeaders = activeExample?.response?.headers && activeExample.response.headers.length > 0;
  const hasResponseBody = !!activeExample?.response?.body?.data;

  const formatJson = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const getRequestData = () => {
    const exampleMethod = activeExample?.request?.method || method;
    const exampleUrl = activeExample?.request?.url || url;
    const headers = activeExample?.request?.headers || [];
    const body = activeExample?.request?.body;
    return { method: exampleMethod, url: exampleUrl, headers, body };
  };

  const handleCopy = async (type: 'curl' | 'javascript' | 'python') => {
    try {
      const snippetInput = getRequestData();
      const generators = {
        curl: generateCurlCommand,
        javascript: generateJavaScriptCode,
        python: generatePythonCode,
      };
      const code = generators[type](snippetInput);
      await navigator.clipboard.writeText(code);
      setCopied(type);
      setShowCopyMenu(false);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy code', error);
    }
  };

  const handleCopyBody = async (type: 'request' | 'response', content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setBodyCopied(type);
      setTimeout(() => setBodyCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy body', error);
    }
  };

  return (
    <StyledWrapper>
      <h3 className="section-title">Examples</h3>
      <div className="examples-container">
        <div className="example-tabs">
          <div className="example-tabs-left">
            {validExamples.map((example, index) => (
              <button
                key={index}
                className={`example-tab ${activeExampleIndex === index ? 'active' : ''}`}
                onClick={() => {
                  setActiveExampleIndex(index);
                  setRequestTab('body');
                  setResponseTab('body');
                }}
              >
                {example.name || `Example ${index + 1}`}
              </button>
            ))}
          </div>
        </div>

        <div className="example-url-row">
          <div className="example-url-left">
            <span className={`example-method ${(activeExample?.request?.method || method).toLowerCase()}`}>
              {activeExample?.request?.method || method}
            </span>
            <span className="example-url">{activeExample?.request?.url || url}</span>
          </div>
          <div className="copy-dropdown" ref={dropdownRef}>
            <button
              className={`copy-curl-btn ${copied ? 'copied' : ''}`}
              onClick={() => setShowCopyMenu(!showCopyMenu)}
              disabled={!hasRequest}
              title="Copy as code"
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              )}
              Code Snippet
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showCopyMenu && (
              <div className="copy-menu">
                <button
                  className={`copy-menu-item ${copied === 'curl' ? 'copied' : ''}`}
                  onClick={() => handleCopy('curl')}
                >
                  {copied === 'curl' ? '✓' : ''} cURL
                </button>
                <button
                  className={`copy-menu-item ${copied === 'javascript' ? 'copied' : ''}`}
                  onClick={() => handleCopy('javascript')}
                >
                  {copied === 'javascript' ? '✓' : ''} JavaScript
                </button>
                <button
                  className={`copy-menu-item ${copied === 'python' ? 'copied' : ''}`}
                  onClick={() => handleCopy('python')}
                >
                  {copied === 'python' ? '✓' : ''} Python
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="example-content">
          {/* Request Section - Always show */}
          <div className="content-section">
            <div className="content-header">
              <span className="content-label">Request</span>
              <div className="content-toggle">
                <button
                  className={`toggle-btn ${requestTab === 'body' ? 'active' : ''} ${!hasRequest ? 'disabled' : ''}`}
                  onClick={() => hasRequest && setRequestTab('body')}
                  disabled={!hasRequest}
                >
                  Body
                </button>
                <button
                  className={`toggle-btn ${requestTab === 'headers' ? 'active' : ''} ${!hasRequest ? 'disabled' : ''}`}
                  onClick={() => hasRequest && setRequestTab('headers')}
                  disabled={!hasRequest}
                >
                  Headers
                </button>
                <button
                  className={`toggle-btn ${requestTab === 'params' ? 'active' : ''} ${!hasRequest ? 'disabled' : ''}`}
                  onClick={() => hasRequest && setRequestTab('params')}
                  disabled={!hasRequest}
                >
                  Params
                </button>
              </div>
            </div>

            {hasRequest ? (
              <>
                {requestTab === 'body' && (
                  hasRequestBody ? (
                    <div className="body-content">
                      <button
                        className={`body-copy-btn ${bodyCopied === 'request' ? 'copied' : ''}`}
                        onClick={() => handleCopyBody('request', formatJson(activeExample.request?.body?.data))}
                        title="Copy"
                      >
                        {bodyCopied === 'request' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                      <pre>{formatJson(activeExample.request?.body?.data)}</pre>
                    </div>
                  ) : (
                    <div className="no-content">No request body</div>
                  )
                )}

                {requestTab === 'headers' && (
                  hasRequestHeaders ? (
                    <table className="headers-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExample.request?.headers?.map((header, idx) => (
                          <tr key={idx}>
                            <td>{header.name}</td>
                            <td>{header.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="no-content">No request headers</div>
                  )
                )}

                {requestTab === 'params' && (
                  hasRequestParams ? (
                    <table className="headers-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExample.request?.params?.map((param: any, idx: number) => (
                          <tr key={idx}>
                            <td>{param.name}</td>
                            <td>{param.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="no-content">No request params</div>
                  )
                )}
              </>
            ) : (
              <div className="no-content">No request data</div>
            )}
          </div>

          {/* Response Section - Always show */}
          <div className="content-section">
            <div className="content-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="content-label">Response</span>
                {activeExample.response?.status && (
                  <span className={`status-badge ${getStatusClass(activeExample.response.status)}`}>
                    {activeExample.response.status}
                  </span>
                )}
              </div>
              <div className="content-toggle">
                <button
                  className={`toggle-btn ${responseTab === 'body' ? 'active' : ''} ${!hasResponse ? 'disabled' : ''}`}
                  onClick={() => hasResponse && setResponseTab('body')}
                  disabled={!hasResponse}
                >
                  Body
                </button>
                <button
                  className={`toggle-btn ${responseTab === 'headers' ? 'active' : ''} ${!hasResponse ? 'disabled' : ''}`}
                  onClick={() => hasResponse && setResponseTab('headers')}
                  disabled={!hasResponse}
                >
                  Headers
                </button>
              </div>
            </div>

            {hasResponse ? (
              <>
                {responseTab === 'body' && (
                  hasResponseBody ? (
                    <div className="body-content">
                      <button
                        className={`body-copy-btn ${bodyCopied === 'response' ? 'copied' : ''}`}
                        onClick={() => handleCopyBody('response', formatJson(activeExample.response?.body?.data))}
                        title="Copy"
                      >
                        {bodyCopied === 'response' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                      <pre>{formatJson(activeExample.response?.body?.data)}</pre>
                    </div>
                  ) : (
                    <div className="no-content">No response body</div>
                  )
                )}

                {responseTab === 'headers' && (
                  hasResponseHeaders ? (
                    <table className="headers-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExample.response?.headers?.map((header, idx) => (
                          <tr key={idx}>
                            <td>{header.name}</td>
                            <td>{header.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="no-content">No response headers</div>
                  )
                )}
              </>
            ) : (
              <div className="no-content">No response data</div>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Examples;
