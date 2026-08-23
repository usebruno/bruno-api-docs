import type { Environment } from '@opencollection/types/config/environments';
import type { Variable, SecretVariable, VariableValueType } from '@opencollection/types/common/variables';
import { MANAGER_LABELS } from '@/constants';
import { getDescription, getVariableTypeLabel } from './request';
import { descriptionText, resolveDescription } from './description';
import { isSecretVariable, unwrapVariableValue, type ExternalSecretEntry } from './variableResolution';
import { rowToVariable, toDataType } from './variableDataType';
import { reconcileScriptVariables } from './scriptVariables';
import type { JsonValue } from '@/runner/utils/variable-interpolator';

const humanizeManager = (type: string | undefined): string => {
  if (!type) return 'External';
  return (
    MANAGER_LABELS[type]
    || type
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};

export interface EnvVarRow {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
  dataType?: string;
  secret?: boolean;
  description?: string;
  source?: Variable;
}

export const envVariableToRow = (variable: Variable, index: number): EnvVarRow => ({
  id: `var-${index}`,
  name: variable.name || '',
  value: unwrapVariableValue(variable.value),
  dataType: getVariableTypeLabel(variable),
  enabled: !variable.disabled,
  secret: isSecretVariable(variable),
  description: getDescription(variable),
  source: variable
});

const rowDescription = (row: EnvVarRow): Variable['description'] | undefined => {
  const text = resolveDescription(row.description);
  if (text === undefined) return undefined;
  const original = row.source?.description;
  return descriptionText(original) === text ? original : text;
};

export const envRowToVariable = (row: EnvVarRow): Variable => {
  const source = row.source ?? ({} as Variable);
  const description = rowDescription(row);
  if (row.secret) {
    const secret = { ...source, name: row.name, disabled: !row.enabled, secret: true } as Variable & { value?: string; type?: VariableValueType };
    const dataType = toDataType(row.dataType);
    if (dataType !== 'string') secret.type = dataType;
    else delete secret.type;
    if (row.value) secret.value = row.value;
    else delete secret.value;
    if (description !== undefined) secret.description = description;
    else delete secret.description;
    return secret;
  }
  const variable = rowToVariable({
    name: row.name,
    value: row.value,
    enabled: row.enabled,
    dataType: row.dataType,
    originalValue: source.value
  });
  return description === undefined ? variable : { ...variable, description };
};

interface ExternalSecretsConfig {
  type?: string;
  variables?: { name?: string; secretName?: string; enabled?: boolean; type?: VariableValueType }[];
}

/**
 * Rebuild an environment's external secrets after the table has been edited.
 *
 * A table row holds only a name, a pointer and a toggle, so anything else on the
 * entry has to be carried across by hand. In particular the hover card stores a
 * typed-in `value` there, which a plain rebuild would throw away.
 *
 * `enabled` is the exception and is dropped on purpose: the toggle is written
 * back as `disabled`, and an entry carrying both could contradict itself.
 */
export const mergeExternalSecretRows = (
  existing: ExternalSecretEntry[] | undefined,
  rows: { name: string; value: string; enabled: boolean }[],
  pointerField: string
): Record<string, unknown>[] => {
  const byName = new Map((existing ?? []).map((variable) => [variable.name, variable]));
  return rows.map((row) => {
    const { enabled: _legacyToggle, ...carried } = byName.get(row.name) ?? {};
    return {
      ...carried,
      name: row.name,
      [pointerField]: row.value,
      disabled: !row.enabled
    };
  });
};

export interface EnvironmentVariableRow {
  name: string;
  value: string;
  dataType: string;
  description?: string;
  disabled: boolean;
}

export interface ExternalSecretRow {
  name: string;
  secretName: string;
  dataType: string;
  disabled: boolean;
}

export interface EnvironmentExternalSecrets {
  type: string;
  typeLabel: string;
  variables: ExternalSecretRow[];
}

export interface EnvironmentVariableGroups {
  variables: EnvironmentVariableRow[];
  secretVariables: EnvironmentVariableRow[];
  externalSecrets: EnvironmentExternalSecrets | null;
}

const getExternalSecrets = (environment: Environment): EnvironmentExternalSecrets | null => {
  const config = (environment as { externalSecrets?: ExternalSecretsConfig }).externalSecrets;
  const variables = (config?.variables ?? [])
    .filter((variable) => variable && variable.name)
    .map((variable) => ({
      name: variable.name ?? '',
      secretName: variable.secretName ?? '',
      dataType: variable.type ?? '',
      disabled: variable.enabled === false
    }));

  if (!variables.length) return null;
  return { type: config?.type ?? '', typeLabel: humanizeManager(config?.type), variables };
};

export const applyScriptEnvVars = (
  environment: Environment,
  upserts: Record<string, JsonValue>,
  deleted: Set<string> = new Set()
): (Variable | SecretVariable)[] => {
  const externalNames = new Set(
    (environment.externalSecrets?.variables ?? [])
      .map((entry) => entry.name)
      .filter((name): name is string => Boolean(name))
  );
  return reconcileScriptVariables(environment.variables ?? [], upserts, { skip: externalNames, deleted });
};

export const getEnvironmentVariables = (environment: Environment | null | undefined): EnvironmentVariableGroups => {
  const variables: EnvironmentVariableRow[] = [];
  const secretVariables: EnvironmentVariableRow[] = [];

  (environment?.variables ?? []).forEach((variable) => {
    if (isSecretVariable(variable)) {
      secretVariables.push({
        name: variable.name ?? '',
        value: '',
        dataType: variable.type ?? '',
        description: getDescription(variable),
        disabled: variable.disabled === true
      });
      return;
    }
    const value = unwrapVariableValue(variable.value);
    variables.push({
      name: variable.name,
      value,
      dataType: value ? getVariableTypeLabel(variable) : '',
      description: getDescription(variable),
      disabled: variable.disabled === true
    });
  });

  return {
    variables,
    secretVariables,
    externalSecrets: environment ? getExternalSecrets(environment) : null
  };
};
