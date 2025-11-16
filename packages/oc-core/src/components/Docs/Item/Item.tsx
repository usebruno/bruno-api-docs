import React, { memo, useCallback } from 'react';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-http';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-xml-doc';
import 'prismjs/components/prism-python';
import { OpenCollectionItem, HttpRequest, Script, Folder } from '../../../types';
import { generateSectionId, getItemId } from '../../../utils/itemUtils';
import {
  MinimalDataTable,
  CompactCodeView,
  StatusBadge
} from '../../../ui/MinimalComponents';
import { CodeSnippets } from '../CodeSnippets/CodeSnippets';
import { StyledWrapper } from './StyledWrapper';
import { Scripts } from './Scripts/Scripts';

const methodColors: Record<string, string> = {
  GET: '#16a34a',
  POST: '#2563eb',
  PUT: '#f97316',
  PATCH: '#8b5cf6',
  DELETE: '#dc2626',
  HEAD: '#6b7280',
  OPTIONS: '#6b7280'
};

const Item = memo(({
  item,
  registerSectionRef,
  theme,
  md,
  parentPath = '',
  collection,
  toggleRunnerMode,
  onTryClick
}: {
  item: OpenCollectionItem;
  registerSectionRef: (id: string, ref: HTMLDivElement | null) => void;
  theme: 'light' | 'dark' | 'auto';
  md: any;
  parentPath?: string;
  collection?: any;
  toggleRunnerMode?: () => void;
  onTryClick?: () => void;
}) => {
  const itemId = getItemId(item);
  const sectionId = generateSectionId(item, parentPath);

  const baseContainerClass = 'item-container';
  const themedContainerClass = theme ? `${baseContainerClass} ${theme}` : baseContainerClass;

  const sectionRefCallback = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      registerSectionRef(sectionId, element);
    }
  }, [sectionId, registerSectionRef]);

  if (item.type === 'folder') {
    const folderItem = item as Folder;

    return (
      <StyledWrapper
        key={itemId}
        id={`section-${sectionId}`}
        ref={sectionRefCallback}
        className={baseContainerClass}
      >
        <div className="item-header-minimal">
          <div className="item-title-section">
            <div className="item-type-badge folder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Folder</span>
            </div>
            <h1 className="item-title">{folderItem.name || 'Untitled Folder'}</h1>
          </div>
        </div>

        {folderItem.docs && (
          <div className="item-docs">
            <div dangerouslySetInnerHTML={{ __html: md.render(folderItem.docs) }} />
          </div>
        )}

        <div className="item-content-grid">
          {folderItem.headers && folderItem.headers.length > 0 && (
            <MinimalDataTable
              data={folderItem.headers}
              title="Headers"
              columns={[
                { key: 'name', label: 'Name', width: '30%' },
                { key: 'value', label: 'Value', width: '50%' },
                { key: 'enabled', label: '', width: '20%', render: (val: any) => val === false ? <StatusBadge status="inactive" text="Disabled" /> : null }
              ]}
            />
          )}

          {folderItem.variables && folderItem.variables.length > 0 && (
            <MinimalDataTable
              data={folderItem.variables.map(v => ({
                name: v.name,
                value: v.value || v.default || '',
                enabled: !v.disabled
              }))}
              title="Variables"
              columns={[
                { key: 'name', label: 'Name', width: '40%' },
                { key: 'value', label: 'Value', width: '40%' },
                { key: 'enabled', label: '', width: '20%', render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} /> }
              ]}
            />
          )}

          <Scripts
            preRequest={folderItem.scripts?.preRequest}
            postResponse={folderItem.scripts?.postResponse}
          />
        </div>
      </StyledWrapper>
    );
  }

  if (item.type === 'script') {
    const scriptItem = item as Script;

    return (
      <StyledWrapper
        key={itemId}
        id={`section-${sectionId}`}
        ref={sectionRefCallback}
        className={baseContainerClass}
      >
        <div className="item-header-minimal">
          <div className="item-title-section">
            <div className="item-type-badge script">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <span>Script</span>
            </div>
            <h1 className="item-title">{scriptItem.name || 'Untitled Script'}</h1>
          </div>
        </div>

        {scriptItem.script && (
          <CompactCodeView
            code={scriptItem.script}
            language="javascript"
          />
        )}
      </StyledWrapper>
    );
  }

  if (item.type === 'http') {
    const httpItem = item as HttpRequest;

    const endpoint = {
      id: itemId,
      name: httpItem.name || 'Untitled',
      method: httpItem.method || 'GET',
      url: httpItem.url || '',
      description: httpItem.docs || '',
      headers: httpItem.headers || [],
      body: httpItem.body || { mode: 'none' },
      params: httpItem.params || [],
      auth: httpItem.auth || { mode: 'none' },
      vars: httpItem.variables || {},
      assertions: httpItem.assertions || [],
      tests: '',
      script: httpItem.scripts || {}
    };

    return (
      <StyledWrapper
        key={itemId}
        className={themedContainerClass}
        id={`section-${sectionId}`}
        ref={sectionRefCallback}
      >
        <div className="item-header-minimal">
          <div className="item-title-section">
            <h1 className="item-title">{endpoint.name}</h1>
            <div className="endpoint-badges">
              <span className="badge-method" style={{ backgroundColor: methodColors[endpoint.method?.toUpperCase()] }}>
                {endpoint.method}
              </span>
              <span className="badge-url">{endpoint.url}</span>
              {(onTryClick || toggleRunnerMode) && (
                <button
                  className="badge-try"
                  onClick={() => {
                    if (onTryClick) {
                      onTryClick();
                    } else if (toggleRunnerMode) {
                      toggleRunnerMode();
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Try
                </button>
              )}
            </div>
          </div>
        </div>

        {endpoint.description && (
          <div className="item-docs">
            <div dangerouslySetInnerHTML={{ __html: md.render(endpoint.description) }} />
          </div>
        )}

        <div className="item-content-main">
          <div className="request-details">
            {endpoint.params && endpoint.params.length > 0 && (
              <MinimalDataTable
                data={endpoint.params}
                title="Query Parameters"
                columns={[
                  { key: 'name', label: 'Name', width: '35%' },
                  { key: 'value', label: 'Value', width: '45%' },
                  { key: 'enabled', label: '', width: '20%', render: (val: any) => val === false ? <StatusBadge status="inactive" text="Disabled" /> : null }
                ]}
              />
            )}

            {endpoint.headers && endpoint.headers.length > 0 && (
              <MinimalDataTable
                data={endpoint.headers}
                title="Headers"
                columns={[
                  { key: 'name', label: 'Name', width: '35%' },
                  { key: 'value', label: 'Value', width: '45%' },
                  { key: 'enabled', label: '', width: '20%', render: (val: any) => val === false ? <StatusBadge status="inactive" text="Disabled" /> : null }
                ]}
              />
            )}

            {endpoint.body && typeof endpoint.body === 'object' && 'data' in endpoint.body && (
              <div className="request-body-section">
                <h3 className="section-title">Body</h3>
                <CompactCodeView
                  code={(endpoint.body as any).data || ''}
                  language={(endpoint.body as any).type || 'json'}
                />
              </div>
            )}

            <Scripts
              preRequest={endpoint.script?.preRequest}
              postResponse={endpoint.script?.postResponse}
            />
          </div>

          <CodeSnippets
            method={endpoint.method}
            url={endpoint.url}
            headers={endpoint.headers}
            body={endpoint.body}
          />
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper
      key={itemId}
      id={`section-${sectionId}`}
      ref={sectionRefCallback}
      className={baseContainerClass}
    >
      <div className="item-header-minimal">
        <h1 className="item-title">{(item as any).name || 'Untitled Item'}</h1>
        <p className="item-subtitle">Unsupported item type: {(item as any).type}</p>
      </div>
    </StyledWrapper>
  );
}, (prevProps, nextProps) => {
  if (prevProps.item.type !== nextProps.item.type) {
    return false;
  }

  const prevItemId = getItemId(prevProps.item);
  const nextItemId = getItemId(nextProps.item);
  if (prevItemId !== nextItemId) {
    return false;
  }

  return (
    prevProps.theme === nextProps.theme &&
    prevProps.parentPath === nextProps.parentPath
  );
});

export default Item;

