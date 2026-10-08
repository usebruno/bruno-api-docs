import React from 'react';
import { describe, it, expect } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { usePromptVariables, type PromptVariablesController } from './usePromptVariables';

const probeTree = () => {
  const box: { current: PromptVariablesController | null } = { current: null };

  const Probe: React.FC = () => {
    box.current = usePromptVariables();
    return null;
  };

  return { box, tree: <Probe /> };
};

describe('asking the reader for prompt values', () => {
  it('sends straight away when the request uses no prompts', async () => {
    const { box, tree } = probeTree();
    useRenderToDom(tree);
    const controller = box.current as PromptVariablesController;

    await expect(controller.collect([])).resolves.toEqual({});
  });

  it('waits for the reader, then sends what they typed', async () => {
    const { box, tree } = probeTree();
    useRenderToDom(tree);
    const controller = box.current as PromptVariablesController;

    const pending = controller.collect(['OTP', 'Region']);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    controller.submit({ OTP: '123456', Region: 'eu' });

    await expect(pending).resolves.toEqual({ '?OTP': '123456', '?Region': 'eu' });
  });

  it('asks again on the next send, because answers are never kept', async () => {
    const { box, tree } = probeTree();
    useRenderToDom(tree);
    const controller = box.current as PromptVariablesController;

    const first = controller.collect(['OTP']);
    controller.submit({ OTP: '123456' });
    await expect(first).resolves.toEqual({ '?OTP': '123456' });

    const second = controller.collect(['OTP']);
    let settled = false;
    void second.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    controller.cancel();
    await expect(second).resolves.toBeNull();
  });

  it('reports a dismissal so the send is abandoned rather than sent half-filled', async () => {
    const { box, tree } = probeTree();
    useRenderToDom(tree);
    const controller = box.current as PromptVariablesController;

    const pending = controller.collect(['OTP']);
    controller.cancel();

    await expect(pending).resolves.toBeNull();
  });

  it('sends an empty string for a prompt the reader left blank', async () => {
    const { box, tree } = probeTree();
    useRenderToDom(tree);
    const controller = box.current as PromptVariablesController;

    const pending = controller.collect(['OTP']);
    controller.submit({});

    await expect(pending).resolves.toEqual({ '?OTP': '' });
  });
});
