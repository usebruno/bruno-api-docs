import React, { useMemo } from 'react';
import type { OpenCollection } from '@opencollection/types';
import type { Item } from '@opencollection/types/collection/item';
import type { GrpcRequest as GrpcRequestItem } from '@opencollection/types/requests/grpc';
import type { Auth } from '@opencollection/types/common/auth';
import {
  getItemName,
  getRequestUrl,
  getItemDocs,
  getRequestAuth,
  getGrpcMethod,
  getGrpcMethodType,
  getGrpcMetadata,
  getGrpcMessages,
  getGrpcProtoFileName,
  getGrpcProtoFilePath,
  countEnabled
} from '@/utils/schemaHelpers';
import {
  resolveInheritedAuth,
  getPreRequestVars,
  getPostResponseVars,
  buildScriptChain,
  getScriptFlow
} from '@/utils/request';
import { collectAssertions } from '@/utils/assertions';
import { collectTests, collectRawTestScripts } from '@/utils/fileUtils';
import { ExecutionContext } from '@/components/ExecutionContext/ExecutionContext';
import { generateGrpcurlCommand, generateGrpcJavaScriptCode, grpcMethodPath } from '@/utils/grpcSnippets';
import { SnippetTabs, type Snippet } from '@/components/SnippetTabs/SnippetTabs';
import { useMarkdownRenderer, useResolvedVariables } from '@/hooks';
import { singleReferenceName } from '@/utils/variableResolution';
import { buildBreadcrumbSegments } from '@/utils/common';
import { AUTH_MODE_LABELS, GRPC_METHOD_TYPE_LABELS } from '@/constants';
import { Section } from '@/components/Section/Section';
import { ContentTypeBadge } from '@/components/ContentTypeBadge/ContentTypeBadge';
import { InheritedAuthBadge } from '@/components/InheritedAuthBadge/InheritedAuthBadge';
import { AuthDetails } from '@/components/AuthDetails/AuthDetails';
import { GrpcMethodTypeIcon } from './GrpcMethodTypeIcon/GrpcMethodTypeIcon';
import { GrpcMessages } from './GrpcMessages/GrpcMessages';
import { GrpcMetadataTable } from './GrpcMetadataTable/GrpcMetadataTable';
import { PageWrapper } from '@/components/PageWrapper/PageWrapper';
import { Heading } from '@/components/Heading/Heading';
import { ViewMore } from '@/components/ViewMore/ViewMore';
import { Breadcrumb, type BreadcrumbSegment } from '@/ui/Breadcrumb/Breadcrumb';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { RequestUrlBar } from '@/components/Request/RequestUrlBar/RequestUrlBar';
import { StyledWrapper } from './StyledWrapper';
import { FileIcon, RefreshIcon } from '@/assets/icons';

const NO_ANCESTRY: Item[] = [];

const NAV_GROUP = { configuration: 'Configuration' } as const;
const NAV_LEVEL = { section: 1, configItem: 2 } as const;

interface GrpcRequestProps {
  item: GrpcRequestItem;
  collection?: OpenCollection | null;
  ancestry?: Item[];
  onBreadcrumbClick?: (uuid: string) => void;
  testId?: string;
}

export const GrpcRequest: React.FC<GrpcRequestProps> = ({
  item,
  ancestry = NO_ANCESTRY,
  collection,
  onBreadcrumbClick,
  testId = 'grpc-request-page'
}) => {
  const name = getItemName(item) || 'Untitled Request';
  const url = getRequestUrl(item);

  const method = getGrpcMethod(item);
  const methodType = getGrpcMethodType(item);
  const protoFileName = getGrpcProtoFileName(item);
  const protoFilePath = getGrpcProtoFilePath(item);
  const methodTypeLabel
    = methodType && Object.prototype.hasOwnProperty.call(GRPC_METHOD_TYPE_LABELS, methodType)
      ? GRPC_METHOD_TYPE_LABELS[methodType]
      : undefined;
  const messages = useMemo(() => getGrpcMessages(item), [item]);
  const metadata = useMemo(() => getGrpcMetadata(item), [item]);
  const enabledMetadataCount = countEnabled(metadata);

  const ownAuth = getRequestAuth(item) as Auth | undefined;
  const resolvedAuth = useMemo(() => resolveInheritedAuth(collection, ancestry, item), [collection, ancestry, item]);
  const effectiveAuth = ownAuth === 'inherit' ? resolvedAuth.auth : ownAuth;
  const showAuth = ownAuth !== undefined;
  const authBadge
    = ownAuth === 'inherit' ? (
      resolvedAuth.source ? (
        <InheritedAuthBadge
          source={resolvedAuth.source}
          onNavigate={onBreadcrumbClick}
          testId="grpc-request-auth-inherited"
        />
      ) : (
        <ContentTypeBadge label="Inherited" />
      )
    ) : undefined;

  const hasLeftColumn
    = Boolean(protoFileName) || Boolean(method) || messages.length > 0 || metadata.length > 0 || showAuth;

  const { lookup } = useResolvedVariables();

  const resolvedUrl = useMemo(() => {
    const variableName = singleReferenceName(url);
    if (!variableName) return undefined;
    const entry = lookup(variableName);
    return entry.secret ? undefined : entry.value || undefined;
  }, [url, lookup]);

  const snippets = useMemo<Snippet[]>(() => {
    if (!method) return [];
    const input = { url, resolvedUrl, method, methodType, protoFilePath, metadata, messages, auth: effectiveAuth };
    const built: Snippet[] = [
      { id: 'grpcurl', label: 'grpcURL', language: 'bash', code: generateGrpcurlCommand(input) }
    ];

    const javaScript = generateGrpcJavaScriptCode(input);
    if (javaScript) {
      built.push({ id: 'javascript', label: 'JavaScript', language: 'javascript', code: javaScript });
    }

    return built;
  }, [url, resolvedUrl, method, methodType, protoFilePath, metadata, messages, effectiveAuth]);

  const md = useMarkdownRenderer();

  const descHtml = useMemo(() => {
    const docs = getItemDocs(item);
    return docs ? md.render(docs) : '';
  }, [item, md]);

  const segments = useMemo<BreadcrumbSegment[]>(
    () => buildBreadcrumbSegments(collection, ancestry),
    [collection, ancestry]
  );

  const preVars = useMemo(() => getPreRequestVars(item), [item]);
  const postVars = useMemo(() => getPostResponseVars(item), [item]);
  const scriptChain = useMemo(() => buildScriptChain(collection, ancestry, item), [collection, ancestry, item]);
  const scriptFlow = useMemo(() => getScriptFlow(collection), [collection]);
  const assertions = useMemo(() => collectAssertions(item), [item]);
  const tests = useMemo(
    () => collectTests(collection, ancestry, item, scriptFlow),
    [collection, ancestry, item, scriptFlow]
  );
  const testScripts = useMemo(
    () => collectRawTestScripts(collection, ancestry, item, scriptFlow),
    [collection, ancestry, item, scriptFlow]
  );

  const hasExecutionContext
    = scriptChain.length > 0 || preVars.length > 0 || postVars.length > 0 || assertions.length > 0 || tests.length > 0;

  return (
    <PageWrapper>
      <StyledWrapper className="grpc-request" data-testid={testId}>
        <Breadcrumb
          segments={segments}
          current={name}
          onSegmentClick={onBreadcrumbClick}
          testId="grpc-request-breadcrumb"
        />

        <Heading size="md" className="mt-1" testId="grpc-request-title">{name}</Heading>

        <RequestUrlBar method="gRPC" capitalizeMethod={false} url={url} className="mt-3" />
        {descHtml && (
          <ViewMore className="mt-6" collapsedHeight="4.5rem" testId="grpc-request-description">
            <div
              className="markdown-documentation"
              data-nav-headings
              data-nav-level={NAV_LEVEL.section}
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          </ViewMore>
        )}

        {hasLeftColumn ? (
          <div className="grpc-request-columns">
            <div className="grpc-request-col-left">
              {protoFileName && (
                <Section
                  label="Proto file"
                  testId="grpc-request-section-proto-file"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                >
                  <div className="grpc-field" data-testid="grpc-request-proto-file">
                    <span className="grpc-field-icon">
                      <FileIcon />
                    </span>
                    <span className="grpc-field-text">{protoFileName}</span>
                  </div>
                </Section>
              )}

              {method && (
                <Section
                  label="RPC method"
                  testId="grpc-request-section-method"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                >
                  <div className="grpc-field" data-testid="grpc-request-method">
                    <GrpcMethodTypeIcon methodType={methodType} className="grpc-field-icon" />
                    <span className="grpc-field-text">{grpcMethodPath(method)}</span>
                    {methodTypeLabel && (
                      <span className="grpc-field-meta" data-testid="grpc-request-method-type">
                        {methodTypeLabel}
                      </span>
                    )}
                  </div>
                </Section>
              )}

              {messages.length > 0 && (
                <Section
                  label="Messages"
                  testId="grpc-request-section-messages"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                  badge={
                    <ContentTypeBadge label={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`} />
                  }
                >
                  <GrpcMessages messages={messages} />
                </Section>
              )}

              {metadata.length > 0 && (
                <Section
                  label="Metadata"
                  testId="grpc-request-section-metadata"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                  badge={
                    enabledMetadataCount ? (
                      <ContentTypeBadge
                        label={`${enabledMetadataCount} ${enabledMetadataCount === 1 ? 'field' : 'fields'}`}
                      />
                    ) : null
                  }
                >
                  <GrpcMetadataTable metadata={metadata} testId="grpc-request-metadata" />
                </Section>
              )}

              {showAuth && (
                <Section
                  label="Auth"
                  testId="grpc-request-section-auth"
                  navGroup={NAV_GROUP.configuration}
                  navLevel={NAV_LEVEL.configItem}
                  badge={authBadge}
                >
                  <AuthDetails
                    auth={effectiveAuth}
                    authModeLabels={AUTH_MODE_LABELS}
                    emptyMessage="No auth"
                    testId="grpc-request-auth"
                  />
                </Section>
              )}
            </div>

            {snippets.length > 0 && (
              <div className="grpc-request-col-right">
                <Section label="Code snippet" testId="grpc-request-section-code-snippet" hideFromNav>
                  <SnippetTabs snippets={snippets} testId="grpc-request-code-snippet" />
                </Section>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            className="grpc-request-empty"
            testId="grpc-request-config-empty"
            icon={<FileIcon />}
            heading="No request configuration"
            subheading="This request has no method, messages, metadata, or authentication configured."
          />
        )}

        <Section
          label="Execution Context"
          testId="grpc-request-section-execution-context"
          className="grpc-request-fullwidth"
          collapsible={hasExecutionContext}
          storageKey="grpc-request-execution-context"
        >
          {hasExecutionContext ? (
            <ExecutionContext
              scriptChain={scriptChain}
              preVars={preVars}
              postVars={postVars}
              assertions={assertions}
              tests={tests}
              testScripts={testScripts}
              flow={scriptFlow}
              requestLabel="GRPC"
              url={url}
              onNavigate={onBreadcrumbClick}
            />
          ) : (
            <EmptyState
              testId="grpc-request-execution-context-empty"
              icon={<RefreshIcon />}
              heading="No execution context"
              subheading="This request has no scripts, variables, asserts, or tests configured."
            />
          )}
        </Section>
      </StyledWrapper>
    </PageWrapper>
  );
};

export default GrpcRequest;
