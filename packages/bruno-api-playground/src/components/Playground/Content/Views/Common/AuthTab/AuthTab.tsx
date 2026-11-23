import React from 'react';
import { Field } from '../../../../../../ui/Field';
import type { SelectOption } from '@usebruno/api-shared/types/selectOption';
import { AUTH_DEFAULTS, AUTH_MODE_LABELS, PLACEMENT_OPTIONS } from '@usebruno/api-shared/constants';
import { REQUEST_PROTOCOL_KEYS } from '@usebruno/api-shared/utils/schemaHelpers';
import type { InheritedAuthSummary } from '@usebruno/api-shared/utils/request';
import { StyledWrapper } from './StyledWrapper';
import NoContentText from '../../../../../../ui/NoContentText/NoContentText';

type AuthFields = { type: string; [field: string]: string | undefined };

interface AuthTabProps {
  auth: unknown;
  onAuthChange: (authType: string) => void;
  onItemChange?(item: object): void;
  item?: object;
  title?: string;
  description?: string;
  showInherit?: boolean;
  showFullAuth?: boolean;
  inheritedAuth?: InheritedAuthSummary | null;
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
  inheritedAuth
}) => {
  const fields = auth as AuthFields;
  const authType = typeof auth === 'object' && auth !== null ? fields.type : auth === 'inherit' ? 'inherit' : 'none';

  const modeOptions: SelectOption[] = [
    { value: 'none', label: 'No Auth' },
    ...(showInherit ? [{ value: 'inherit', label: 'Inherit' }] : []),
    ...Object.keys(AUTH_DEFAULTS).map((mode) => ({ value: mode, label: AUTH_MODE_LABELS[mode] ?? mode }))
  ];

  const updateItemAuth = (newAuth: unknown) => {
    if (!onItemChange || !item) return;
    // Write auth where getRequestAuth reads it: a request keeps it in its protocol block
    // (http/graphql/…); a Collection/Folder nests it under `request` (created if absent).
    const protocolKey = REQUEST_PROTOCOL_KEYS.find((key) => key in item);
    const owner = item as Record<string, object | undefined>;
    if (protocolKey) {
      onItemChange({ ...item, [protocolKey]: { ...owner[protocolKey], auth: newAuth } });
    } else {
      onItemChange({ ...item, request: { ...owner.request, auth: newAuth } });
    }
  };

  const handleAuthTypeChange = (newAuthType: string) => {
    if (!showFullAuth || !onItemChange || !item) {
      onAuthChange(newAuthType);
      return;
    }
    if (newAuthType === 'none') {
      updateItemAuth(undefined);
    } else if (newAuthType === 'inherit') {
      updateItemAuth('inherit');
    } else {
      updateItemAuth({ ...(AUTH_DEFAULTS[newAuthType] ?? { type: newAuthType }) });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    updateItemAuth({ ...fields, [field]: value });
  };

  const textField = (field: string, label: string) => (
    <Field label={label} htmlFor={`auth-field-${field}`}>
      <Field.Input
        id={`auth-field-${field}`}
        testId={`auth-${field}`}
        value={fields[field] || ''}
        placeholder={label}
        onChange={(value) => handleFieldChange(field, value)}
      />
    </Field>
  );

  const secretField = (field: string, label: string) => (
    <Field label={label} htmlFor={`auth-field-${field}`}>
      <Field.Input
        secret
        id={`auth-field-${field}`}
        testId={`auth-${field}`}
        value={fields[field] || ''}
        placeholder={label}
        onChange={(value) => handleFieldChange(field, value)}
      />
    </Field>
  );

  const renderForm = () => {
    switch (fields.type) {
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
            <Field label="Add To" htmlFor="auth-field-placement">
              <Field.Select
                id="auth-field-placement"
                testId="auth-placement"
                ariaLabel="Add To"
                value={fields.placement || 'header'}
                options={PLACEMENT_OPTIONS}
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

  const renderBody = () => {
    if (!auth) {
      return <NoContentText text="No authentication configured." />;
    }
    if (auth === 'inherit') {
      return (
        <p className="auth-empty" data-testid="auth-inherit-notice">
          {inheritedAuth ? (
            <>
              Auth inherited from {inheritedAuth.sourceName}:{' '}
              <span className="auth-inherited-mode" data-testid="inherited-auth-mode">
                {inheritedAuth.modeLabel}
              </span>
            </>
          ) : (
            'Auth inherited from the parent folder or collection.'
          )}
        </p>
      );
    }
    if (showFullAuth) {
      return <div className="auth-form">{renderForm()}</div>;
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
        <Field.Select
          testId="auth-mode-select"
          ariaLabel="Authentication type"
          value={authType}
          options={modeOptions}
          onChange={handleAuthTypeChange}
        />
        {renderBody()}
      </div>
    </StyledWrapper>
  );
};

export default AuthTab;
