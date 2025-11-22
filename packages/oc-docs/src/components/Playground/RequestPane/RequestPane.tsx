import React, { useState } from 'react';
import type { HttpRequest } from '@opencollection/types/requests/http';
import CodeEditor from '../../../ui/CodeEditor/CodeEditor';
import Tabs from '../../../ui/Tabs/Tabs';
import KeyValueTable, { KeyValueRow } from '../../../ui/KeyValueTable/KeyValueTable';

interface RequestPaneProps {
  item: HttpRequest;
  onItemChange: (item: HttpRequest) => void;
}

const RequestPane: React.FC<RequestPaneProps> = ({ item, onItemChange }) => {
  const [activeTab, setActiveTab] = useState('params');

  const handleParamsChange = (params: KeyValueRow[]) => {
    const updatedParams = params.map(p => ({
      name: p.name,
      value: p.value,
      disabled: !p.enabled,
      type: 'query' as const
    }));
    onItemChange({ ...item, params: updatedParams });
  };

  const handleHeadersChange = (headers: KeyValueRow[]) => {
    const updatedHeaders = headers.map(h => ({
      name: h.name,
      value: h.value,
      disabled: !h.enabled
    }));
    onItemChange({ ...item, headers: updatedHeaders });
  };

  const handleFormBodyChange = (formData: KeyValueRow[]) => {
    const updatedBody = formData.map(f => ({
      name: f.name,
      value: f.value,
      enabled: f.enabled
    }));
    onItemChange({ ...item, body: updatedBody });
  };

  const renderParams = () => {
    const paramsData: KeyValueRow[] = (item.params || []).map((param, index) => ({
      id: `param-${index}`,
      name: param.name || '',
      value: param.value || '',
      enabled: !param.disabled,
      type: param.type || 'query'
    }));

    return (
      <div className="py-4">
        <div className="mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Query Parameters
          </span>
        </div>
        <KeyValueTable
          data={paramsData}
          onChange={handleParamsChange}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
          showEnabled={true}
        />
      </div>
    );
  };

  const renderHeaders = () => {
    const headersData: KeyValueRow[] = (item.headers || []).map((header, index) => ({
      id: `header-${index}`,
      name: header.name || '',
      value: header.value || '',
      enabled: !header.disabled
    }));

    return (
      <div className="py-4">
        <div className="mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Headers
          </span>
        </div>
        <KeyValueTable
          data={headersData}
          onChange={handleHeadersChange}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
          showEnabled={true}
        />
      </div>
    );
  };

  const renderBody = () => (
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Body Type:
                  </span>
                  <select
                    value={
                      !item.body ? 'none' :
                      'type' in item.body ? item.body.type :
                      Array.isArray(item.body) ? 'form-urlencoded' : 'none'
                    }
                    onChange={(e) => {
                      const bodyType = e.target.value;
                      if (bodyType === 'none') {
                        onItemChange({ ...item, body: null });
                      } else if (['json', 'text', 'xml', 'sparql'].includes(bodyType)) {
                        onItemChange({ 
                          ...item, 
                          body: { type: bodyType as any, data: '' }
                        });
                      } else if (bodyType === 'form-urlencoded') {
                        onItemChange({ 
                          ...item, 
                          body: []
                        });
                      }
                    }}
                    className="px-2 py-1 text-sm border rounded"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="none">None</option>
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                    <option value="xml">XML</option>
                    <option value="form-urlencoded">Form URL Encoded</option>
                  </select>
                </div>
              </div>
              
              {!item.body ? (
                <div className="text-center py-8 border-2 border-dashed rounded" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  No body content. Select a body type to add content.
                </div>
              ) : 'data' in item.body && typeof item.body.data === 'string' ? (
                <CodeEditor
                  value={item.body.data}
                  onChange={(value) => {
                    if ('data' in item.body!) {
                      onItemChange({
                        ...item,
                        body: { ...item.body, data: value }
                      });
                    }
                  }}
                  language={item.body.type === 'json' ? 'json' : item.body.type === 'xml' ? 'xml' : 'text'}
                  height="300px"
                />
              ) : Array.isArray(item.body) ? (
                (() => {
                  const formBodyData: KeyValueRow[] = (item.body as any[]).map((field: any, index: number) => ({
                    id: `form-${index}`,
                    name: field.name || '',
                    value: field.value || '',
                    enabled: field.enabled !== false
                  }));

                  return (
                    <div>
                      <div className="mb-4">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Form Data
                        </span>
                      </div>
                      <KeyValueTable
                        data={formBodyData}
                        onChange={handleFormBodyChange}
                        keyPlaceholder="Key"
                        valuePlaceholder="Value"
                        showEnabled={true}
                      />
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  Unsupported body type
                </div>
              )}
            </div>
          </div>
  );

  const renderAuth = () => (
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Authentication
                </span>
                <select
                  value={item.auth?.type || 'none'}
                  onChange={(e) => {
                    const authType = e.target.value;
                    if (authType === 'none') {
                      onItemChange({ ...item, auth: undefined });
                    } else {
                      onItemChange({ 
                        ...item, 
                        auth: { type: authType as any }
                      });
                    }
                  }}
                  className="px-2 py-1 text-sm border rounded"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="none">No Auth</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apikey">API Key</option>
                  <option value="digest">Digest Auth</option>
                  <option value="awsv4">AWS Signature v4</option>
                </select>
              </div>
              
              {!item.auth ? (
                <div className="text-center py-8 border-2 border-dashed rounded" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  No authentication configured. Select an auth type to configure.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Type: {item.auth.type}
                    </span>
                  </div>
                  
                  {item.auth.type === 'basic' && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Username:
                        </label>
                        <input
                          type="text"
                          value={item.auth.username || ''}
                          onChange={(e) => {
                            onItemChange({
                              ...item,
                              auth: { type: 'basic', username: e.target.value, password: item.auth?.type === 'basic' ? item.auth.password : undefined }
                            });
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Password:
                        </label>
                        <input
                          type="password"
                          value={item.auth.password || ''}
                          onChange={(e) => {
                            onItemChange({
                              ...item,
                              auth: { type: 'basic', password: e.target.value, username: item.auth?.type === 'basic' ? item.auth.username : undefined }
                            });
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Enter password"
                        />
                      </div>
                    </>
                  )}
                  
                  {item.auth.type === 'bearer' && (
                    <div className="flex items-center gap-2">
                      <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                        Token:
                      </label>
                      <input
                        type="text"
                        value={item.auth.token || ''}
                        onChange={(e) => {
                          onItemChange({
                            ...item,
                            auth: { type: 'bearer', token: e.target.value }
                          });
                        }}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                        placeholder="Enter bearer token"
                      />
                    </div>
                  )}
                  
                  {item.auth.type === 'apikey' && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Key:
                        </label>
                        <input
                          type="text"
                          value={item.auth.key || ''}
                          onChange={(e) => {
                            const currentAuth = item.auth?.type === 'apikey' ? item.auth : { type: 'apikey' as const };
                            onItemChange({
                              ...item,
                              auth: { ...currentAuth, type: 'apikey', key: e.target.value }
                            });
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Enter API key name"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Value:
                        </label>
                        <input
                          type="text"
                          value={item.auth.value || ''}
                          onChange={(e) => {
                            const currentAuth = item.auth?.type === 'apikey' ? item.auth : { type: 'apikey' as const };
                            onItemChange({
                              ...item,
                              auth: { ...currentAuth, type: 'apikey', value: e.target.value }
                            });
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="Enter API key value"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Add to:
                        </label>
                        <select
                          value={item.auth.placement || 'header'}
                          onChange={(e) => {
                            const placement = e.target.value as 'header' | 'query';
                            const currentAuth = item.auth?.type === 'apikey' ? item.auth : { type: 'apikey' as const };
                            onItemChange({
                              ...item,
                              auth: { ...currentAuth, type: 'apikey', placement }
                            });
                          }}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <option value="header">Header</option>
                          <option value="query">Query Parameter</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {!['basic', 'bearer', 'apikey'].includes(item.auth.type) && (
                    <div className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                      Configuration for {item.auth.type} auth is not yet implemented
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
  );

  const renderScripts = () => (
          <div className="py-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Pre-request Script
                </h4>
                <CodeEditor
                  value={item.scripts?.preRequest || ''}
                  onChange={(value) => {
                    const scripts = item.scripts || {};
                    onItemChange({
                      ...item,
                      scripts: { ...scripts, preRequest: value }
                    });
                  }}
                  language="javascript"
                  height="150px"
                />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Post-response Script
                </h4>
                <CodeEditor
                  value={item.scripts?.postResponse || ''}
                  onChange={(value) => {
                    const scripts = item.scripts || {};
                    onItemChange({
                      ...item,
                      scripts: { ...scripts, postResponse: value }
                    });
                  }}
                  language="javascript"
                  height="150px"
                />
              </div>


            </div>
          </div>
  );

  const renderTests = () => (
          <div className="py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Tests
              </h4>
              <CodeEditor
                value={item.scripts?.tests || ''}
                onChange={(value) => {
                  const scripts = item.scripts || {};
                  onItemChange({
                    ...item,
                    scripts: { ...scripts, tests: value }
                  });
                }}
                language="javascript"
                height="400px"
              />
            </div>
          </div>
  );

  const tabs = [
    { id: 'params', label: 'Params', contentIndicator: item.params?.length || undefined, content: renderParams() },
    { id: 'headers', label: 'Headers', contentIndicator: item.headers?.length || undefined, content: renderHeaders() },
    { id: 'body', label: 'Body', content: renderBody() },
    { id: 'auth', label: 'Auth', content: renderAuth() },
    { id: 'scripts', label: 'Scripts', content: renderScripts() },
    { id: 'tests', label: 'Tests', content: renderTests() }
  ];

  return (
    <div className="h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Tabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};

export default RequestPane; 