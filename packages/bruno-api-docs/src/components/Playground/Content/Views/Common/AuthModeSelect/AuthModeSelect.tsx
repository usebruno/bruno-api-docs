import React from 'react';
import type { Auth } from '@opencollection/types/requests/http';
import { Field, type SelectOption } from '@/ui/Field';
import { AUTH_DEFAULTS, AUTH_MODE_LABELS } from '@/constants';

interface AuthModeSelectProps {
  auth: unknown;
  onChange: (mode: string) => void;
  showInherit?: boolean;
  testId?: string;
}

export const authModeOf = (auth: unknown): string => {
  if (typeof auth === 'object' && auth !== null) return (auth as { type: string }).type;
  return auth === 'inherit' ? 'inherit' : 'none';
};

export const authForMode = (mode: string): Auth | undefined => {
  if (mode === 'none') return undefined;
  if (mode === 'inherit') return 'inherit';
  return { ...(AUTH_DEFAULTS[mode] ?? { type: mode }) } as unknown as Auth;
};

export const AuthModeSelect: React.FC<AuthModeSelectProps> = ({
  auth,
  onChange,
  showInherit = false,
  testId = 'auth-mode-select'
}) => {
  const modeOptions: SelectOption[] = [
    { value: 'none', label: 'No Auth' },
    ...(showInherit ? [{ value: 'inherit', label: 'Inherit' }] : []),
    ...Object.keys(AUTH_DEFAULTS).map((mode) => ({ value: mode, label: AUTH_MODE_LABELS[mode] ?? mode }))
  ];

  return (
    <Field.Select
      testId={testId}
      ariaLabel="Authentication type"
      value={authModeOf(auth)}
      options={modeOptions}
      onChange={onChange}
    />
  );
};

export default AuthModeSelect;
