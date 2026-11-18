import React from 'react';
import { Field } from '@/ui/Field';
import { AUTH_MODE_LABELS, PLACEMENT_OPTIONS } from '@/constants';
import { REQUEST_PROTOCOL_KEYS } from '@/utils/schemaHelpers';
import { canNavigateToSource, type InheritedAuth } from '@/utils/request';
import { GoToIcon } from '@/assets/icons';
import AuthModeSelect, { authForMode, authModeOf } from '../AuthModeSelect/AuthModeSelect';
import { StyledWrapper } from './StyledWrapper';
import NoContentText from '@/ui/NoContentText/NoContentText';

interface AuthTabProps {
  auth: any;
  onAuthChange: (authType: string) => void;
  onItemChange?: (item: any) => void;
  item?: any;
  title?: string;
  description?: string;
  showInherit?: boolean;
  showFullAuth?: boolean;
  showModeSelect?: boolean;
  inheritedAuth?: InheritedAuth | null;
  onNavigateToSource?: (uuid: string) => void;
}

export const AuthTab: React.FC<AuthTabProps> = ({
  auth,
  onAuthChange,
  onItemChange,
  item,
  title,
  description,
  showInherit = false,
  showFullAuth = false,
  showModeSelect = true,
  inheritedAuth,
  onNavigateToSource
}) => {
  const updateItemAuth = (newAuth: unknown) => {
    if (!onItemChange || !item) return;
    // Write auth where getRequestAuth reads it: a request keeps it in its protocol block
    // (http/graphql/…); a Collection/Folder nests it under `request` (created if absent).
    const protocolKey = REQUEST_PROTOCOL_KEYS.find((key) => key in item);
    if (protocolKey) {
      onItemChange({ ...item, [protocolKey]: { ...item[protocolKey], auth: newAuth } });
    } else {
      onItemChange({ ...item, request: { ...item.request, auth: newAuth } });
    }
  };

  const handleAuthTypeChange = (newAuthType: string) => {
    if (!showFullAuth || !onItemChange || !item) {
      onAuthChange(newAuthType);
      return;
    }
    updateItemAuth(authForMode(newAuthType));
  };

  const handleFieldChange = (field: string, value: string) => {
    updateItemAuth({ ...auth, [field]: value });
  };

  const renderForm = (formAuth: Record<string, string | undefined>, readOnly = false) => {
    const prefix = readOnly ? 'auth-inherited' : 'auth';

    const textField = (field: string, label: string) => (
      <Field label={label} htmlFor={`${prefix}-field-${field}`}>
        <Field.Input
          id={`${prefix}-field-${field}`}
          testId={`${prefix}-${field}`}
          value={formAuth[field] || ''}
          placeholder={label}
          readOnly={readOnly}
          onChange={(value) => handleFieldChange(field, value)}
        />
      </Field>
    );

    const secretField = (field: string, label: string) => (
      <Field label={label} htmlFor={`${prefix}-field-${field}`}>
        <Field.Input
          secret
          id={`${prefix}-field-${field}`}
          testId={`${prefix}-${field}`}
          value={formAuth[field] || ''}
          placeholder={label}
          readOnly={readOnly}
          onChange={(value) => handleFieldChange(field, value)}
        />
      </Field>
    );

    switch (formAuth.type) {
      case 'basic':
      case 'digest':
        return (
          <>
            {textField('username', 'Username')}
            {secretField('password', 'Password')}
          </>
        );
      case 'bearer':
        return secretField('token', 'Token');
      case 'apikey':
        return (
          <>
            {textField('key', 'Key')}
            {textField('value', 'Value')}
            <Field label="Add To" htmlFor={`${prefix}-field-placement`}>
              <Field.Select
                id={`${prefix}-field-placement`}
                testId={`${prefix}-placement`}
                ariaLabel="Add To"
                value={formAuth.placement || 'header'}
                options={PLACEMENT_OPTIONS}
                disabled={readOnly}
                onChange={(value) => handleFieldChange('placement', value)}
              />
            </Field>
          </>
        );
      case 'awsv4':
        return (
          <>
            {textField('accessKeyId', 'Access Key ID')}
            {secretField('secretAccessKey', 'Secret Access Key')}
            {textField('sessionToken', 'Session Token')}
            {textField('service', 'Service')}
            {textField('region', 'Region')}
            {textField('profileName', 'AWS CLI Profile Name')}
          </>
        );
      default:
        return null;
    }
  };

  const renderInherited = (inherited: InheritedAuth) => {
    const { auth: inheritedValue, source } = inherited;
    const mode = authModeOf(inheritedValue);
    const modeLabel = mode === 'none' ? 'No Auth' : AUTH_MODE_LABELS[mode] ?? mode;
    const modeLink = canNavigateToSource(source, onNavigateToSource) ? (
      <button
        type="button"
        className="auth-inherited-mode"
        data-testid="inherited-auth-mode"
        aria-label={`Open ${modeLabel} auth in ${source.name}`}
        onClick={() => onNavigateToSource!(source.uuid)}
      >
        {modeLabel}
        <GoToIcon width={14} height={14} />
      </button>
    ) : (
      <span className="auth-inherited-mode" data-testid="inherited-auth-mode">
        {modeLabel}
      </span>
    );

    return (
      <div className="auth-inherited" data-testid="auth-inherit-notice">
        <p className="auth-inherited-source" data-testid="auth-inherited-source">
          Auth inherited from <span className="auth-inherited-source-name">{source.name}</span> {modeLink}
        </p>
        {typeof inheritedValue === 'object' && (
          <div className="auth-form" data-testid="auth-inherited-fields">
            {renderForm(inheritedValue as unknown as Record<string, string | undefined>, true)}
          </div>
        )}
      </div>
    );
  };

  const renderBody = () => {
    if (!auth) {
      return <NoContentText text="No authentication configured." />;
    }
    if (auth === 'inherit') {
      if (!inheritedAuth) {
        return (
          <p className="auth-empty" data-testid="auth-inherit-notice">
            Auth inherited from the parent folder or collection.
          </p>
        );
      }
      return renderInherited(inheritedAuth);
    }
    if (showFullAuth) {
      return <div className="auth-form">{renderForm(auth)}</div>;
    }
    return <NoContentText text="{title} auth is configured elsewhere." />;
  };

  return (
    <StyledWrapper className="auth-tab">
      {(Boolean(title) || Boolean(description)) && (
        <div className="auth-header flex items-center justify-between">
          {title && <span className="title text-sm font-semibold">{title}</span>}
          {description && <span className="description text-xs leading-tight">{description}</span>}
        </div>
      )}

      <div className="auth-body">
        {showModeSelect && (
          <AuthModeSelect auth={auth} showInherit={showInherit} onChange={handleAuthTypeChange} />
        )}
        {renderBody()}
      </div>
    </StyledWrapper>
  );
};

export default AuthTab;
