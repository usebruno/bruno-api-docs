import React, { useState, useEffect } from 'react';
import type { HttpRequest, HttpRequestParam, HttpRequestHeader } from '@opencollection/types/requests/http';
import type { Auth } from '@opencollection/types/common/auth';
import { StyledWrapper } from './StyledWrapper';
import HighlightedInput from '@/components/HighlightedInput/HighlightedInput';
import { useResolvedVariables } from '@/hooks/useVariableResolver';
import { getHttpMethod, getRequestUrl, getHttpParams, getRequestHeaders, getHttpBody } from '@/utils/schemaHelpers';
import { buildRequestUrl, syncPathParams, syncQueryParams } from '@/utils/pathParams';
import { HttpMethodSelector } from '@/components/HttpMethodSelector/HttpMethodSelector';
import { CopyButton } from '@/ui/CopyButton/CopyButton';
import { SendIcon } from '@/assets/icons';
import { CodeSnippetTabs } from '@/components/CodeSnippetTabs/CodeSnippetTabs';

interface QueryBarProps {
  item: HttpRequest;
  onSendRequest: () => void;
  isLoading: boolean;
  onItemChange: (item: HttpRequest) => void;
  effectiveAuth?: Auth;
  effectiveHeaders?: HttpRequestHeader[];
}

type RequestWithLegacyUrl = HttpRequest & { url?: string };

export const applyUrlChange = (item: HttpRequest, newUrl: string): HttpRequest => {
  const currentParams = getHttpParams(item);
  const syncedParams = syncQueryParams(syncPathParams(currentParams, newUrl), newUrl);

  const updated: RequestWithLegacyUrl = {
    ...(item as RequestWithLegacyUrl),
    http: {
      ...item.http,
      url: newUrl,
      ...(syncedParams !== currentParams ? { params: syncedParams } : {})
    }
  };
  delete updated.url;
  return updated;
};

const QueryBar: React.FC<QueryBarProps> = ({
  item,
  onSendRequest,
  isLoading,
  onItemChange,
  effectiveAuth,
  effectiveHeaders
}) => {
  const { isFound, names } = useResolvedVariables();
  const [url, setUrl] = useState(getRequestUrl(item));
  const [method, setMethod] = useState(getHttpMethod(item));

  useEffect(() => {
    setUrl(getRequestUrl(item));
    setMethod(getHttpMethod(item));
  }, [item]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onItemChange(applyUrlChange(item, newUrl));
  };

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    const updatedItem = {
      ...item,
      http: {
        ...item.http,
        method: newMethod
      }
    };
    onItemChange(updatedItem);
  };

  const snippetUrl = buildRequestUrl(
    url,
    getHttpParams(item).filter((param: HttpRequestParam) => param.type !== 'path' || (param.value ?? '').trim() !== '')
  );

  return (
    <StyledWrapper>
      <HttpMethodSelector method={method} onMethodChange={handleMethodChange} testId="method-select" />

      <HighlightedInput
        value={url}
        onValueChange={handleUrlChange}
        isFound={isFound}
        names={names}
        placeholder="Enter request URL"
        testId="query-bar-url"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && url.trim() && !isLoading) {
            onSendRequest();
          }
        }}
      />

      <div className="actions">
        <CodeSnippetTabs
          method={method}
          url={snippetUrl}
          headers={effectiveHeaders ?? getRequestHeaders(item)}
          body={getHttpBody(item)}
          auth={effectiveAuth}
          variant="icon"
          interpolation="switch"
          testId="query-bar-code-snippet"
        />
        <CopyButton text={url} label="Copy URL" copiedLabel="Copied" testId="query-bar-copy-url" />
        <button
          type="button"
          onClick={onSendRequest}
          disabled={isLoading || !url.trim()}
          className="send"
          data-testid="query-bar-send"
        >
          {isLoading ? (
            <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <SendIcon />
          )}
          {isLoading ? 'Sending' : 'Send'}
        </button>
      </div>
    </StyledWrapper>
  );
};

export default QueryBar;
