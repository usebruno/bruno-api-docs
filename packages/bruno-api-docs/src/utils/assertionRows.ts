import type { Assertion } from '@opencollection/types/common/assertions';
import type { KeyValueRow } from '@/components/KeyValueTable/KeyValueTable';
import { descriptionText, resolveDescription } from './description';

export const DEFAULT_ASSERTION_OPERATOR = 'eq';

export const UNARY_ASSERTION_OPERATORS = new Set([
  'isEmpty',
  'isNotEmpty',
  'isNull',
  'isUndefined',
  'isDefined',
  'isTruthy',
  'isFalsy',
  'isJson',
  'isNumber',
  'isString',
  'isBoolean',
  'isArray'
]);

export const assertionsToRows = (assertions: Assertion[]): KeyValueRow[] =>
  assertions.map((assertion, index) => {
    const description = descriptionText(assertion.description);
    return {
      id: `assertion-${index}`,
      name: assertion.expression || '',
      operator: assertion.operator || DEFAULT_ASSERTION_OPERATOR,
      value: assertion.value || '',
      enabled: !assertion.disabled,
      ...(description !== undefined ? { description } : {})
    };
  });

export const rowsToAssertions = (rows: KeyValueRow[]): Assertion[] =>
  rows.map((row) => {
    const operator = row.operator || DEFAULT_ASSERTION_OPERATOR;
    const description = resolveDescription(row.description);
    return {
      expression: row.name,
      operator,
      value: UNARY_ASSERTION_OPERATORS.has(operator) ? undefined : row.value,
      disabled: !row.enabled,
      ...(description !== undefined ? { description } : {})
    };
  });
