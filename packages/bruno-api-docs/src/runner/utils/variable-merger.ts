import type { OpenCollection } from '@opencollection/types';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { Variable } from '@opencollection/types/common/variables';
import { getTreePathFromCollectionToItem } from './tree-utils';
import { isFolder, getRequestVariables } from '@/utils/schemaHelpers';
import { coerceVariableValue } from '@/utils/variableDataType';
import type { Variables, JsonValue } from './variable-interpolator';

export const getCollectionVariables = (collection: OpenCollection): Variables => {
  const result: Variables = {};
  const collectionVars: Variable[] = collection.request?.variables || [];
  collectionVars.forEach((variable) => {
    if (!variable.disabled) {
      result[variable.name] = coerceVariableValue(variable.value) as JsonValue;
    }
  });
  return result;
};

/**
 * Folder- and request-level variables merged into their native, data-type-coerced form
 * (object/number/boolean/string) — the interpolator inserts an object as raw JSON and a
 * number/boolean bare, so a typed variable stays valid inside a JSON body. Collection-level
 * variables are resolved once via getCollectionVariables and shared on the run context.
 */
export const getCollectionFolderRequestVariables = (
  collection: OpenCollection,
  request: HttpRequest
): {
  folderVariables: Variables;
  requestVariables: Variables;
} => {
  const requestTreePath = getTreePathFromCollectionToItem(collection, request);

  const folderVariables: Variables = {};
  const requestVariablesResult: Variables = {};

  // Folder-level variables, in order from parent to child.
  for (const item of requestTreePath) {
    if (isFolder(item)) {
      const folderVars = (item as any).request?.variables || [];
      folderVars.forEach((variable: any) => {
        if (!variable.disabled) {
          folderVariables[variable.name] = coerceVariableValue(variable.value) as JsonValue;
        }
      });
    }
  }

  // Request-level variables.
  const requestVars = getRequestVariables(request);
  requestVars.forEach((variable: any) => {
    if (!variable.disabled) {
      requestVariablesResult[variable.name] = coerceVariableValue(variable.value) as JsonValue;
    }
  });

  return { folderVariables, requestVariables: requestVariablesResult };
};
