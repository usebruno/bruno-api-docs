import React from 'react';
import { AUTH_MODE_LABELS } from '../../constants';
import { inheritedCountLabel } from '../../utils/request';
import { PageWrapper } from '../../components/PageWrapper/PageWrapper';
import { Heading } from '../../components/Heading/Heading';
import { Section } from '../../components/Section/Section';
import { Breadcrumb } from '../../ui/Breadcrumb/Breadcrumb';
import { EmptyState } from '../../ui/EmptyState/EmptyState';
import { FileIcon, RefreshIcon } from '../../assets/icons';
import { RequestUrlBar } from '../../components/Request/RequestUrlBar/RequestUrlBar';
import { ViewMore } from '../../components/ViewMore/ViewMore';
import { AuthDetails } from '../../components/AuthDetails/AuthDetails';
import { RequestParams } from '../../components/Request/RequestParams/RequestParams';
import { ContentTypeBadge } from '../../components/ContentTypeBadge/ContentTypeBadge';
import { PropertyTable } from '../../components/PropertyTable/PropertyTable';
import { InheritedAuthBadge } from '../../components/InheritedAuthBadge/InheritedAuthBadge';
import { ExecutionContext } from '../../components/ExecutionContext/ExecutionContext';
import type { RequestPageData } from './useRequestPageData';
import { StyledWrapper } from './StyledWrapper';

export const NAV_GROUP = { configuration: 'Configuration' } as const;
export const NAV_LEVEL = { section: 1, configItem: 2 } as const;

interface RequestPageLayoutProps {
  data: RequestPageData;
  method: string;
  badgeLabel: string;
  hasConfigContent: boolean;
  emptyConfigSubheading: string;
  codeSnippet: React.ReactNode;
  afterColumns?: React.ReactNode;
  onTryClick?: () => void;
  onBreadcrumbClick?: (uuid: string) => void;
  testId?: string;
  children: React.ReactNode;
}

export const RequestPageLayout: React.FC<RequestPageLayoutProps> = ({
  data,
  method,
  badgeLabel,
  hasConfigContent,
  emptyConfigSubheading,
  codeSnippet,
  afterColumns,
  onTryClick,
  onBreadcrumbClick,
  testId = 'request-page',
  children
}) => {
  const {
    name,
    url,
    descHtml,
    pathParams,
    queryParams,
    ownAuth,
    effectiveAuth,
    showAuth,
    authSource,
    inheritedHeaders,
    headerTableRows,
    hasHeaders,
    hasInheritedHeaders,
    hasParams,
    segments,
    scriptChain,
    preVars,
    postVars,
    inheritedPreVars,
    inheritedPostVars,
    assertions,
    tests,
    testScripts,
    scriptFlow,
    hasExecutionContext
  } = data;

  const authBadge
    = ownAuth === 'inherit' ? (
      authSource ? (
        <InheritedAuthBadge source={authSource} onNavigate={onBreadcrumbClick} testId="request-auth-inherited" />
      ) : (
        <ContentTypeBadge label="Inherited" />
      )
    ) : undefined;

  const hasLeftColumn = showAuth || hasParams || hasConfigContent || hasHeaders || hasInheritedHeaders;

  return (
    <PageWrapper>
      <StyledWrapper className="request" data-testid={testId}>
        <Breadcrumb segments={segments} current={name} onSegmentClick={onBreadcrumbClick} testId="request-breadcrumb" />

        <Heading size="md" style={{ marginTop: '0.25rem' }} testId="request-title">{name}</Heading>

        <RequestUrlBar method={badgeLabel} url={url} onTry={onTryClick} style={{ marginTop: '0.75rem' }} />

        {descHtml && (
          <ViewMore collapsedHeight="4.5rem" style={{ marginTop: '1.5rem' }} testId="request-description">
            <div
              className="markdown-documentation"
              data-nav-headings
              data-nav-level={NAV_LEVEL.section}
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          </ViewMore>
        )}

        <div className="request-columns">
          <div className="request-col-left">
            {hasLeftColumn ? (
              <>
                {hasParams && (
                  <Section label="Params" testId="request-section-params" navGroup={NAV_GROUP.configuration} navLevel={NAV_LEVEL.configItem}>
                    <RequestParams path={pathParams} query={queryParams} />
                  </Section>
                )}

                {children}

                {(hasHeaders || hasInheritedHeaders) && (
                  <Section
                    label="Headers"
                    testId="request-section-headers"
                    navGroup={NAV_GROUP.configuration}
                    navLevel={NAV_LEVEL.configItem}
                    badge={
                      hasInheritedHeaders ? (
                        <ContentTypeBadge label={inheritedCountLabel(inheritedHeaders.length, 'header')} />
                      ) : undefined
                    }
                  >
                    <PropertyTable rows={headerTableRows} onNavigate={onBreadcrumbClick} />
                  </Section>
                )}

                {showAuth && (
                  <Section label="Auth" testId="request-section-auth" navGroup={NAV_GROUP.configuration} navLevel={NAV_LEVEL.configItem} badge={authBadge}>
                    <AuthDetails auth={effectiveAuth} authModeLabels={AUTH_MODE_LABELS} emptyMessage="No auth" />
                  </Section>
                )}
              </>
            ) : hasExecutionContext ? null : (
              <EmptyState
                testId="request-config-empty"
                icon={<FileIcon />}
                heading="No request configuration"
                subheading={emptyConfigSubheading}
              />
            )}
          </div>

          <div className="request-col-right">
            <Section label="Code Snippet" testId="request-section-code-snippet" hideFromNav>{codeSnippet}</Section>
          </div>
        </div>

        {afterColumns}

        <Section
          label="Execution Context"
          testId="request-section-execution-context"
          className="request-fullwidth"
          collapsible={hasExecutionContext}
          storageKey="request-execution-context"
        >
          {hasExecutionContext ? (
            <ExecutionContext
              scriptChain={scriptChain}
              preVars={preVars}
              postVars={postVars}
              inheritedPreVars={inheritedPreVars}
              inheritedPostVars={inheritedPostVars}
              assertions={assertions}
              tests={tests}
              testScripts={testScripts}
              flow={scriptFlow}
              method={method}
              url={url}
              onNavigate={onBreadcrumbClick}
            />
          ) : (
            <EmptyState
              testId="execution-context-empty"
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

export default RequestPageLayout;
