import type { Variable, SecretVariable, VariableValueOrVariants, VariableValueType, VariableValueVariant } from '@opencollection/types/common/variables';
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

const applyScriptValueToVariable = (
  variable: Variable | SecretVariable,
  scriptValue: JsonValue
): Variable | SecretVariable => {
  const newDataType = inferScriptVarDataType(scriptValue);
  const newValueString = coerceScriptVarValue(scriptValue);

  if (isSecretVariable(variable)) {
    const secret = variable as WritableSecret;
    const isUnchanged = (secret.value ?? '') === newValueString && toDataType(secret.type) === toDataType(newDataType);
    if (isUnchanged) return variable;

    const updatedSecret: WritableSecret = { ...secret, value: newValueString };
    if (newDataType === 'string') delete updatedSecret.type;
    else updatedSecret.type = newDataType;
    return updatedSecret;
  }

  const current = unwrapVariableTyped(variable.value);
  const isUnchanged = current.value === newValueString && toDataType(current.dataType) === toDataType(newDataType);
  if (isUnchanged) return variable;

  if (Array.isArray(variable.value) && variable.value.length > 0) {
    const variants = variable.value;
    const selected = variants.findIndex((variant) => variant.selected);
    const target = selected >= 0 ? selected : 0;
    const newValue = scriptVarToVariableValue(scriptValue) as VariableValueVariant['value'];
    const updated = variants.map((variant, index) =>
      index === target ? { ...variant, value: newValue } : variant
    );
    return { ...variable, value: updated };
  }
  return { ...variable, value: scriptVarToVariableValue(scriptValue) };
};

export interface ReconcileOptions {
  skip?: Set<string>;
  deleted?: Set<string>;
}

export const reconcileScriptVariables = (
  existing: (Variable | SecretVariable)[],
  upserts: Record<string, JsonValue>,
  { skip = new Set(), deleted = new Set() }: ReconcileOptions = {}
): (Variable | SecretVariable)[] => {
  const upsertKeys = Object.keys(upserts);
  const upsertSet = new Set(upsertKeys);

  const targetIndex = new Map<string, number>();
  existing.forEach((variable, index) => {
    const name = variable.name ?? '';
    if (variable.disabled || !upsertSet.has(name)) return;
    const prev = targetIndex.get(name);
    if (prev === undefined || isSecretVariable(variable) || !isSecretVariable(existing[prev])) {
      targetIndex.set(name, index);
    }
  });

  const seen = new Set<string>();
  const result: (Variable | SecretVariable)[] = [];

  existing.forEach((variable, index) => {
    const name = variable.name ?? '';
    if (variable.disabled) {
      result.push(variable);
      return;
    }
    seen.add(name);
    if (deleted.has(name)) return;
    if (targetIndex.get(name) === index) {
      result.push(applyScriptValueToVariable(variable, upserts[name]));
    } else {
      result.push(variable);
    }
  });

  for (const name of upsertKeys) {
    if (seen.has(name) || skip.has(name)) continue;
    result.push({ name, value: scriptVarToVariableValue(upserts[name]) } as Variable);
  }

  return result;
};
