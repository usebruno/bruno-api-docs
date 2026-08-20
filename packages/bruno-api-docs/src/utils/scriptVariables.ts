import type { OpenCollection } from '@opencollection/types';
import type { Variable, SecretVariable, VariableValueOrVariants, VariableValueType } from '@opencollection/types/common/variables';
import type { JsonValue } from '@/runner/utils/variable-interpolator';
import { unwrapVariableTyped, isSecretVariable } from './variableResolution';
import { toDataType, type VariableDataType } from './variableDataType';

export const coerceScriptVarValue = (value: JsonValue | undefined): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const inferScriptVarDataType = (value: JsonValue): VariableDataType => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value !== null && typeof value === 'object') return 'object';
  return 'string';
};

export const scriptVarToVariableValue = (value: JsonValue): VariableValueOrVariants => {
  const dataType = inferScriptVarDataType(value);
  const data = coerceScriptVarValue(value);
  return dataType === 'string' ? data : { type: dataType as VariableValueType, data };
};

type WritableSecret = SecretVariable & { value?: string };

const applyScriptValueToVariable = (variable: Variable, scriptValue: JsonValue): Variable => {
  const newDataType = inferScriptVarDataType(scriptValue);
  const newValueString = coerceScriptVarValue(scriptValue);

  if (isSecretVariable(variable)) {
    const secret = variable as WritableSecret;
    const isUnchanged = (secret.value ?? '') === newValueString && toDataType(secret.type) === toDataType(newDataType);
    if (isUnchanged) return variable;

    const updatedSecret: WritableSecret = { ...secret, value: newValueString };
    if (newDataType === 'string') delete updatedSecret.type;
    else updatedSecret.type = newDataType;
    return updatedSecret as Variable;
  }

  const current = unwrapVariableTyped(variable.value);
  const isUnchanged = current.value === newValueString && toDataType(current.dataType) === toDataType(newDataType);
  if (isUnchanged) return variable;
  return { ...variable, value: scriptVarToVariableValue(scriptValue) };
};

export const reconcileScriptVariables = (
  existing: Variable[],
  finalVars: Record<string, JsonValue>,
  skip: Set<string> = new Set()
): Variable[] => {
  const finalKeys = Object.keys(finalVars);
  const finalSet = new Set(finalKeys);
  const seen = new Set<string>();
  const result: Variable[] = [];

  for (const variable of existing) {
    const name = variable.name ?? '';
    if (variable.disabled) {
      result.push(variable);
      seen.add(name);
      continue;
    }
    if (finalSet.has(name)) {
      result.push(applyScriptValueToVariable(variable, finalVars[name]));
      seen.add(name);
    }
  }

  for (const name of finalKeys) {
    if (seen.has(name) || skip.has(name)) continue;
    result.push({ name, value: scriptVarToVariableValue(finalVars[name]) } as Variable);
  }

  return result;
};

export const applyScriptCollectionVarsToCollection = (
  collection: OpenCollection | null,
  finalVars: Record<string, JsonValue>
): OpenCollection | null => {
  if (!collection) return null;
  const request = collection.request ?? {};
  const existing = (request.variables ?? []) as Variable[];
  return { ...collection, request: { ...request, variables: reconcileScriptVariables(existing, finalVars) } };
};
