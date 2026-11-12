import React from 'react';
import { describe, it, expect } from 'vitest';
import { TestProviders } from '@/test-utils/providers';
import { createSession, type Session } from '@/session/session';
import { hydrateWithUUIDs } from '@/utils/fileUtils';
import {
  ItemVariableResolverProvider,
  VariableResolverProvider,
  useResolvedVariables,
  type VariableResolver
} from '@/hooks';
import { useRenderToDom } from '@/hooks/useRenderToDom';

const collection: any = {
  request: { variables: [{ name: 'OTP', value: 'a-real-variable' }] },
  config: { environments: [] },
  items: []
};

const probeTree = (session: Session) => {
  const box: { current: VariableResolver | null } = { current: null };

  const Probe: React.FC = () => {
    box.current = useResolvedVariables();
    return null;
  };

  return {
    box,
    tree: (
      <TestProviders document={collection} session={session}>
        <ItemVariableResolverProvider
          ancestry={[]}
          item={null}
          onWriteVariable={session.workspace.setVariable}
        >
          <Probe />
        </ItemVariableResolverProvider>
      </TestProviders>
    )
  };
};

const newSession = () => {
  const session = createSession();
  session.workspace.replaceCollection(hydrateWithUUIDs(collection as never));
  return session;
};

describe('looking a prompt up through the variable resolver', () => {
  it('names it as a prompt rather than reporting an invalid variable name', () => {
    const { box, tree } = probeTree(newSession());
    useRenderToDom(tree);
    const resolver = box.current as VariableResolver;

    expect(resolver.lookup('?OTP').scope).toBe('prompt');
    expect(resolver.lookup('?OTP').valid).toBe(true);
  });

  it('keeps it separate from a real variable that shares the bare name', () => {
    const { box, tree } = probeTree(newSession());
    useRenderToDom(tree);
    const resolver = box.current as VariableResolver;

    expect(resolver.lookup('OTP').scope).toBe('collection');
    expect(resolver.lookup('OTP').value).toBe('a-real-variable');
  });

  it('shows no value, because answers live only for the send that collected them', () => {
    const { box, tree } = probeTree(newSession());
    useRenderToDom(tree);

    expect((box.current as VariableResolver).lookup('?OTP').value).toBe('');
  });

  it('is not editable, matching the desktop app', () => {
    const { box, tree } = probeTree(newSession());
    useRenderToDom(tree);

    expect((box.current as VariableResolver).lookup('?OTP').simpleString).toBe(false);
  });

  it('does not treat a padded token as a prompt, matching the tokenizer', () => {
    const { box, tree } = probeTree(newSession());
    useRenderToDom(tree);

    expect((box.current as VariableResolver).lookup('? OTP').scope).not.toBe('prompt');
  });

  it('still writes an ordinary variable that shares the bare name', () => {
    const session = newSession();
    const { box, tree } = probeTree(session);
    useRenderToDom(tree);

    (box.current as VariableResolver).updateVariable('OTP', 'changed');

    const variables = session.workspace.get().collection?.request?.variables as {
      value: string;
    }[];

    expect(variables[0].value).toBe('changed');
  });
});

describe('a prompt token outside the playground', () => {
  it('is named as a prompt even where no playground provider is mounted', () => {
    const box: { current: VariableResolver | null } = { current: null };
    const Probe: React.FC = () => {
      box.current = useResolvedVariables();
      return null;
    };

    useRenderToDom(
      <TestProviders session={newSession()}>
        <VariableResolverProvider>
          <Probe />
        </VariableResolverProvider>
      </TestProviders>
    );

    expect((box.current as VariableResolver).lookup('?Region').scope).toBe('prompt');
    expect((box.current as VariableResolver).lookup('?Region').valid).toBe(true);
  });
});
