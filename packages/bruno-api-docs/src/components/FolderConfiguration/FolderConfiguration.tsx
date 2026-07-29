import React from 'react';
import type { FolderConfig } from '../../utils/folder';
import { headerRows, inheritedCountLabel } from '../../utils/request';
import { Code } from '../Code/Code';
import { SectionLabel } from '../SectionLabel/SectionLabel';
import { PropertyTable, type PropertyRow } from '../PropertyTable/PropertyTable';
import { AuthDetails } from '../AuthDetails/AuthDetails';
import { ContentTypeBadge } from '../ContentTypeBadge/ContentTypeBadge';
import { InheritedAuthBadge } from '../InheritedAuthBadge/InheritedAuthBadge';
import { inheritedHeaderRows, preVarRows, postVarRows } from '../PropertyTable/inheritedRows';
import { StyledWrapper } from './StyledWrapper';

interface FolderConfigurationProps {
  config: FolderConfig;
  authModeLabels?: Record<string, string>;
  onNavigate?: (uuid: string) => void;
  testId?: string;
}

export const FolderConfiguration: React.FC<FolderConfigurationProps> = ({
  config,
  authModeLabels = {},
  onNavigate,
  testId
}) => {
  const hasInheritedHeaders = config.inheritedHeaders.length > 0;
  const hasHeaders = config.headers.length > 0 || hasInheritedHeaders;
  const hasAuth = Boolean(config.auth);
  const hasScripts = Boolean(config.preRequest || config.postResponse);
  const inheritedPreVars = config.inheritedPreVariables;
  const inheritedPostVars = config.inheritedPostVariables;
  const showPreVars = config.variables.length > 0 || inheritedPreVars.length > 0;
  const showPostVars = config.postVariables.length > 0 || inheritedPostVars.length > 0;
  const hasVariables = showPreVars || showPostVars;
  const inheritedVarCount = inheritedPreVars.length + inheritedPostVars.length;
  const hasTests = Boolean(config.tests);

  const authSource = config.authSource;
  const authBadge = authSource ? (
    <InheritedAuthBadge source={authSource} onNavigate={onNavigate} testId="folder-config-auth-inherited" />
  ) : undefined;

  // Own rows first, then inherited rows (each carrying a goto-source link) in the SAME table.
  const headerTableRows: PropertyRow[] = [
    ...headerRows(config.headers),
    ...inheritedHeaderRows(config.inheritedHeaders)
  ];

  const preRows = preVarRows(config.variables, inheritedPreVars);
  const postRows = postVarRows(config.postVariables, inheritedPostVars);

  return (
    <StyledWrapper className="folder-configuration" data-testid={testId}>
      {hasHeaders && (
        <div className="config-group" data-testid="folder-config-headers">
          <div className="config-group-head">
            <SectionLabel className="config-group-label">Headers</SectionLabel>
            {hasInheritedHeaders && (
              <ContentTypeBadge label={inheritedCountLabel(config.inheritedHeaders.length, 'header')} />
            )}
          </div>
          <PropertyTable rows={headerTableRows} onNavigate={onNavigate} />
        </div>
      )}

      {hasAuth && (
        <div className="config-group" data-testid="folder-config-auth">
          <div className="config-group-head">
            <SectionLabel className="config-group-label">Auth</SectionLabel>
            {authBadge}
          </div>
          <AuthDetails auth={config.auth} authModeLabels={authModeLabels} testId="folder-config-auth-details" />
        </div>
      )}

      {hasVariables && (
        <div className="config-group" data-testid="folder-config-vars">
          <div className="config-group-head">
            <SectionLabel className="config-group-label">Vars</SectionLabel>
            {inheritedVarCount > 0 && <ContentTypeBadge label={inheritedCountLabel(inheritedVarCount, 'var')} />}
          </div>
          <div className="config-columns">
            {showPreVars && (
              <div className="config-column">
                <p className="config-phase-label">Pre-Request</p>
                <PropertyTable rows={preRows} onNavigate={onNavigate} />
              </div>
            )}
            {showPostVars && (
              <div className="config-column">
                <p className="config-phase-label">Post-Response</p>
                <PropertyTable rows={postRows} onNavigate={onNavigate} />
              </div>
            )}
          </div>
        </div>
      )}

      {hasScripts && (
        <div className="config-group" data-testid="folder-config-script">
          <div className="config-group-head">
            <SectionLabel className="config-group-label">Script</SectionLabel>
          </div>
          <div className="config-columns">
            {config.preRequest && (
              <div className="config-column">
                <p className="config-phase-label">Pre-Request</p>
                <Code code={config.preRequest} language="javascript" showLineNumbers />
              </div>
            )}
            {config.postResponse && (
              <div className="config-column">
                <p className="config-phase-label">Post-Response</p>
                <Code code={config.postResponse} language="javascript" showLineNumbers />
              </div>
            )}
          </div>
        </div>
      )}

      {hasTests && (
        <div className="config-group" data-testid="folder-config-tests">
          <div className="config-group-head">
            <SectionLabel className="config-group-label">Tests</SectionLabel>
          </div>
          <Code code={config.tests as string} language="javascript" showLineNumbers testId="folder-config-tests-code" />
        </div>
      )}
    </StyledWrapper>
  );
};

export default FolderConfiguration;
