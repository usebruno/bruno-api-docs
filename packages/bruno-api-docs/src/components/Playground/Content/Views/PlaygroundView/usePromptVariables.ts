import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPromptVariableMap } from '@/utils/promptVariables';
import type { Variables } from '@/runner/utils/variable-interpolator';

interface PendingPrompt {
  names: string[];
}

export interface PromptVariablesController {
  pending: PendingPrompt | null;
  collect: (names: string[]) => Promise<Variables | null>;
  submit: (values: Record<string, string>) => void;
  cancel: () => void;
}

export const usePromptVariables = (): PromptVariablesController => {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const resolveRef = useRef<((values: Record<string, string> | null) => void) | null>(null);

  const settle = useCallback((values: Record<string, string> | null) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setPending(null);
    resolve?.(values);
  }, []);

  const collect = useCallback(
    async (names: string[]): Promise<Variables | null> => {
      if (!names.length) return {};

      settle(null);

      const values = await new Promise<Record<string, string> | null>((resolve) => {
        resolveRef.current = resolve;
        setPending({ names });
      });

      return values ? buildPromptVariableMap(names, values) : null;
    },
    [settle]
  );

  const submit = useCallback((values: Record<string, string>) => settle(values), [settle]);
  const cancel = useCallback(() => settle(null), [settle]);

  useEffect(() => () => resolveRef.current?.(null), []);

  return useMemo(() => ({ pending, collect, submit, cancel }), [pending, collect, submit, cancel]);
};
