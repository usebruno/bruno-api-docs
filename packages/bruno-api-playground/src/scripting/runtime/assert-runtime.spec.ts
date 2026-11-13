import { describe, it, expect, beforeAll } from 'vitest';
import AssertRuntime from './assert-runtime';

const response = {
  status: 200,
  statusText: 'OK',
  headers: {},
  responseTime: 5,
  url: 'https://api.example.com',
  body: null
} as never;

const request = { method: 'GET', url: 'https://api.example.com' } as never;

const run = (value: string, variables: Record<string, unknown>) =>
  new AssertRuntime().runAssertions(
    [{ expression: 'res.status', operator: 'eq', value }] as never,
    request,
    response,
    variables as never
  )[0];

beforeAll(async () => {
  for (let attempt = 0; attempt < 200 && run('200', {}).status !== 'pass'; attempt += 1) {
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
});

describe('the expected value of an assertion', () => {
  it('resolves a prompt answer, so the reader is compared against what they typed', () => {
    expect(run('{{?Expected}}', { promptVariables: { '?Expected': '200' } }).status).toBe('pass');
  });

  it('resolves an ordinary variable', () => {
    expect(run('{{expected}}', { collectionVariables: { expected: '200' } }).status).toBe('pass');
  });

  it('resolves a prompt answer reached through a variable', () => {
    expect(
      run('{{expected}}', {
        collectionVariables: { expected: '{{?Expected}}' },
        promptVariables: { '?Expected': '200' }
      }).status
    ).toBe('pass');
  });

  it('resolves a folder or request variable, not just the environment ones', () => {
    expect(run('{{fromFolder}}', { folderVariables: { fromFolder: '200' } }).status).toBe('pass');
    expect(run('{{fromRequest}}', { requestVariables: { fromRequest: '200' } }).status).toBe('pass');
  });

  it('leaves a plain value alone', () => {
    expect(run('200', {}).status).toBe('pass');
    expect(run('404', {}).status).toBe('fail');
  });
});
