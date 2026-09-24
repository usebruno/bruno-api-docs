import { describe, it, expect } from 'vitest';
import type { HttpRequest } from '@opencollection/types/requests/http';
import { interpolateVars } from './variable-interpolator';

const req = (http: Record<string, any>): HttpRequest => ({ http: { method: 'GET', ...http } as any });

describe('sending a request with prompt answers', () => {
  it('puts the answer into the URL', () => {
    const out = interpolateVars(req({ url: 'https://api.com/otp/{{?OTP}}' }), {
      promptVariables: { '?OTP': '123456' }
    });

    expect(out.http!.url).toBe('https://api.com/otp/123456');
  });

  it('puts the answer into a header value and a header name', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', headers: [{ name: 'X-{{?Header}}', value: '{{?Token}}' }] }),
      { promptVariables: { '?Header': 'Otp', '?Token': 'abc' } }
    );

    expect(out.http!.headers![0]).toMatchObject({ name: 'X-Otp', value: 'abc' });
  });

  it('puts the answer into a query parameter', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', params: [{ name: 'otp', value: '{{?OTP}}', type: 'query' }] }),
      { promptVariables: { '?OTP': '123456' } }
    );

    expect(out.http!.params![0].value).toBe('123456');
  });

  it('puts the answer into a JSON body exactly as the reader typed it', () => {
    const out = interpolateVars(
      req({
        url: 'https://api.com',
        headers: [{ name: 'content-type', value: 'application/json' }],
        body: { type: 'json', data: '{"otp":"{{?OTP}}"}' }
      }),
      { promptVariables: { '?OTP': 'a"b' } }
    );

    expect((out.http!.body as { data: string }).data).toBe('{"otp":"a"b"}');
  });

  it('puts the answer into a form field even when the collection sets no content type header', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', body: { type: 'form-urlencoded', data: [{ name: 'otp', value: '{{?OTP}}', enabled: true }] } }),
      { promptVariables: { '?OTP': '123456' } }
    );

    expect((out.http!.body as { data: { value: string }[] }).data[0].value).toBe('123456');
  });

  it('puts the answer into a multipart field even when the collection sets no content type header', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', body: { type: 'multipart-form', data: [{ name: 'otp', value: '{{?OTP}}', enabled: true }] } }),
      { promptVariables: { '?OTP': '123456' } }
    );

    expect((out.http!.body as { data: { value: string }[] }).data[0].value).toBe('123456');
  });

  it('leaves the token in place when the reader was never asked', () => {
    const out = interpolateVars(req({ url: 'https://api.com/otp/{{?OTP}}' }));

    expect(out.http!.url).toBe('https://api.com/otp/{{?OTP}}');
  });

  it('sends an empty string for a prompt the reader left blank', () => {
    const out = interpolateVars(req({ url: 'https://api.com/otp/{{?OTP}}' }), {
      promptVariables: { '?OTP': '' }
    });

    expect(out.http!.url).toBe('https://api.com/otp/');
  });

  it('puts the answer into a bearer token', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', auth: { type: 'bearer', token: '{{?Token}}' } }),
      { promptVariables: { '?Token': 'abc123' } }
    );

    expect(out.http!.auth).toMatchObject({ type: 'bearer', token: 'abc123' });
  });

  it('puts the answers into a basic username and password', () => {
    const out = interpolateVars(
      req({
        url: 'https://api.com',
        auth: { type: 'basic', username: '{{?User}}', password: '{{?Pass}}' }
      }),
      { promptVariables: { '?User': 'ada', '?Pass': 'hunter2' } }
    );

    expect(out.http!.auth).toMatchObject({ type: 'basic', username: 'ada', password: 'hunter2' });
  });

  it('puts the answers into an api key name and value', () => {
    const out = interpolateVars(
      req({
        url: 'https://api.com',
        auth: { type: 'apikey', key: 'X-{{?KeyName}}', value: '{{?KeyValue}}' }
      }),
      { promptVariables: { '?KeyName': 'Otp', '?KeyValue': '123456' } }
    );

    expect(out.http!.auth).toMatchObject({ type: 'apikey', key: 'X-Otp', value: '123456' });
  });

  it('leaves an auth token in place when the reader was never asked', () => {
    const out = interpolateVars(
      req({ url: 'https://api.com', auth: { type: 'bearer', token: '{{?Token}}' } })
    );

    expect(out.http!.auth).toMatchObject({ type: 'bearer', token: '{{?Token}}' });
  });
});

describe('where prompt answers sit among the other variables', () => {
  it('wins over every other scope, matching the desktop app', () => {
    const out = interpolateVars(req({ url: 'https://api.com/{{value}}' }), {
      collectionVariables: { value: 'collection' },
      environmentVariables: { value: 'environment' },
      folderVariables: { value: 'folder' },
      requestVariables: { value: 'request' },
      runtimeVariables: { value: 'runtime' },
      promptVariables: { value: 'prompt' }
    });

    expect(out.http!.url).toBe('https://api.com/prompt');
  });

  it('cannot be shadowed by an ordinary variable, because answers are keyed by the token text', () => {
    const out = interpolateVars(req({ url: '{{?OTP}}|{{OTP}}' }), {
      environmentVariables: { OTP: 'from-env' },
      promptVariables: { '?OTP': 'typed-in' }
    });

    expect(out.http!.url).toBe('typed-in|from-env');
  });

  it('resolves a prompt used inside another variable value', () => {
    const out = interpolateVars(req({ url: '{{host}}/users' }), {
      environmentVariables: { host: 'https://{{?Host}}' },
      promptVariables: { '?Host': 'api.example.com' }
    });

    expect(out.http!.url).toBe('https://api.example.com/users');
  });

  it('leaves other variable values untouched when the reader was never asked', () => {
    const out = interpolateVars(req({ url: '{{host}}/users' }), {
      environmentVariables: { host: 'https://{{?Host}}' }
    });

    expect(out.http!.url).toBe('https://{{?Host}}/users');
  });

  it('does not disturb a variable value that holds an ordinary token', () => {
    const out = interpolateVars(req({ url: '{{path}}' }), {
      environmentVariables: { path: '/v1/{{unset}}' },
      promptVariables: { '?OTP': '1' }
    });

    expect(out.http!.url).toBe('/v1/{{unset}}');
  });
});

describe('prompt names and values the single-pass interpolator used to miss', () => {
  it('resolves a prompt whose name contains a dot, instead of reading it as nested access', () => {
    const out = interpolateVars(req({ url: 'https://api.com/{{?user.id}}' }), {
      promptVariables: { '?user.id': '42' }
    });

    expect(out.http!.url).toBe('https://api.com/42');
  });

  it('still reads a genuinely nested value such as process.env', () => {
    const out = interpolateVars(req({ url: '{{process.env.HOST}}' }), {
      processEnvVars: { HOST: 'https://api.com' },
      promptVariables: { '?OTP': '1' }
    });

    expect(out.http!.url).toBe('https://api.com');
  });

  it('resolves a prompt nested inside an object-valued variable', () => {
    const out = interpolateVars(req({ url: '{{config}}' }), {
      collectionVariables: { config: { host: '{{?Host}}' } },
      promptVariables: { '?Host': 'api.example.com' }
    });

    expect(out.http!.url).toBe('{"host":"api.example.com"}');
  });

  it('resolves a prompt nested inside an array-valued variable', () => {
    const out = interpolateVars(req({ url: '{{hosts}}' }), {
      collectionVariables: { hosts: ['{{?Host}}'] },
      promptVariables: { '?Host': 'api.example.com' }
    });

    expect(out.http!.url).toBe('["api.example.com"]');
  });

  it('leaves dynamic tokens in a variable value for the main pass rather than expanding them early', () => {
    const out = interpolateVars(req({ url: '{{path}}' }), {
      collectionVariables: { path: '/{{?Id}}/{{$randomUUID}}' },
      promptVariables: { '?Id': '7' }
    });

    expect(out.http!.url).toMatch(/^\/7\/[0-9a-f-]{36}$/);
  });
});

describe('what the prompt pre-pass must not disturb', () => {
  it('keeps a dynamic token in a variable value fresh per field, prompts or not', () => {
    const out = interpolateVars(
      req({ url: '{{path}}', headers: [{ name: 'X-Id', value: '{{path}}' }] }),
      {
        collectionVariables: { path: '/{{$randomUUID}}' },
        promptVariables: { '?Id': '7' }
      }
    );

    expect(out.http!.url).not.toBe(out.http!.headers![0].value);
  });

  it('leaves a non-plain object variable intact instead of flattening it', () => {
    const when = new Date('2020-01-02T03:04:05.000Z');
    const out = interpolateVars(req({ url: 'https://api.com/{{when}}/{{?Id}}' }), {
      collectionVariables: { when: when as never },
      promptVariables: { '?Id': '7' }
    });

    expect(out.http!.url).toContain('2020-01-02');
    expect(out.http!.url).not.toContain('{}');
  });

  it('does not change how an ordinary dotted variable name resolves', () => {
    const out = interpolateVars(req({ url: '{{a.b}}' }), {
      collectionVariables: { 'a': { b: 'nested' }, 'a.b': 'flat' },
      promptVariables: { '?Id': '7' }
    });

    expect(out.http!.url).toBe('nested');
  });
});

describe('resolving through layers of variables, as the desktop app does', () => {
  it('resolves a prompt reached through two variables', () => {
    const out = interpolateVars(req({ url: '{{outer}}/users' }), {
      collectionVariables: { outer: '{{inner}}', inner: 'https://{{?Host}}' },
      promptVariables: { '?Host': 'api.example.com' }
    });

    expect(out.http!.url).toBe('https://api.example.com/users');
  });

  it('answers the same prompt everywhere it appears, including inside another variable', () => {
    const out = interpolateVars(req({ url: '{{?OTP}}/{{path}}' }), {
      collectionVariables: { path: 'otp/{{?OTP}}' },
      promptVariables: { '?OTP': '123456' }
    });

    expect(out.http!.url).toBe('123456/otp/123456');
  });

  it('answers a prompt reached through two variables and again at the top level', () => {
    const out = interpolateVars(req({ url: '{{?Host}}/{{outer}}' }), {
      collectionVariables: { outer: '{{inner}}', inner: '{{?Host}}/v1' },
      promptVariables: { '?Host': 'api.example.com' }
    });

    expect(out.http!.url).toBe('api.example.com/api.example.com/v1');
  });

  it('resolves a variable token that the reader typed into the dialog', () => {
    const out = interpolateVars(req({ url: '{{?Path}}/users' }), {
      collectionVariables: { baseUrl: 'https://api.example.com' },
      promptVariables: { '?Path': '{{baseUrl}}/v1' }
    });

    expect(out.http!.url).toBe('https://api.example.com/v1/users');
  });

  it('gives up rather than looping forever on variables that point at each other', () => {
    const out = interpolateVars(req({ url: '{{a}}' }), {
      collectionVariables: { a: '{{b}}', b: '{{a}}' }
    });

    expect(out.http!.url).toMatch(/^\{\{[ab]\}\}$/);
  });

  it('leaves a variable that refers to itself alone', () => {
    const out = interpolateVars(req({ url: '{{self}}' }), {
      collectionVariables: { self: '{{self}}' }
    });

    expect(out.http!.url).toBe('{{self}}');
  });

  it('still leaves an unknown token untouched', () => {
    const out = interpolateVars(req({ url: '{{known}}/{{unknown}}' }), {
      collectionVariables: { known: 'ok' }
    });

    expect(out.http!.url).toBe('ok/{{unknown}}');
  });
});
