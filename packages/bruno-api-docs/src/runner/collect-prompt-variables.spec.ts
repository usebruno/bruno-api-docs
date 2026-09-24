import { describe, it, expect, vi } from 'vitest';
import type { Environment } from '@opencollection/types/config/environments';
import { RequestRunner } from './index';
import { parseYaml } from '@/utils/yamlUtils';

const collectionYaml = `
opencollection: "1.0.0"
info:
  name: "Prompt Collection"
  version: "1.0.0"
request:
  headers:
    - name: "X-Collection"
      value: "{{?Collection Header}}"
  variables:
    - name: "host"
      value: "https://{{?Host}}"
items:
  - name: "Folder"
    type: "folder"
    items:
      - name: "Prompted"
        type: "http"
        method: "POST"
        url: "{{host}}/users/{{?User id}}"
        headers:
          - name: "Content-Type"
            value: "application/json"
          - name: "X-Otp"
            value: "{{?OTP}}"
          - name: "X-Off"
            value: "{{?Disabled Header}}"
            disabled: true
        params:
          - name: "trace"
            value: "{{?Trace}}"
            type: "query"
          - name: "off"
            value: "{{?Disabled Param}}"
            type: "query"
            disabled: true
        body:
          type: "json"
          data: |
            {"token":"{{?Token}}"}
        script:
          req: |
            bru.setVar('ignored', '{{?Never Asked}}');
      - name: "Plain"
        type: "http"
        method: "GET"
        url: "https://api.example.com/health"
      - name: "Form"
        type: "http"
        method: "POST"
        url: "https://api.example.com/submit"
        body:
          type: "form-urlencoded"
          data:
            - name: "on"
              value: "{{?Sent Field}}"
            - name: "off"
              value: "{{?Skipped Field}}"
              disabled: true
      - name: "Multipart"
        type: "http"
        method: "POST"
        url: "https://api.example.com/upload"
        body:
          type: "multipart-form"
          data:
            - name: "on"
              value: "{{?Sent Part}}"
            - name: "off"
              value: "{{?Skipped Part}}"
              disabled: true
      - name: "Variants"
        type: "http"
        method: "POST"
        url: "https://api.example.com/variants"
        body:
          - title: "Chosen"
            selected: true
            body:
              type: "form-urlencoded"
              data:
                - name: "on"
                  value: "{{?Chosen Field}}"
                - name: "off"
                  value: "{{?Chosen Skipped}}"
                  disabled: true
          - title: "Other"
            body:
              type: "form-urlencoded"
              data:
                - name: "x"
                  value: "{{?Other Variant}}"
`;

const collection = parseYaml(collectionYaml) as any;
const folder = collection.items[0];
const promptedRequest = folder.items[0];
const plainRequest = folder.items[1];
const formRequest = folder.items[2];
const multipartRequest = folder.items[3];
const variantRequest = folder.items[4];

const environment = {
  name: 'Local',
  variables: [
    { name: 'region', value: '{{?Region}}' },
    { name: 'host', value: 'https://fixed.example.com' }
  ]
} as unknown as Environment;

const runner = new RequestRunner();

describe('working out which prompts a request needs', () => {
  it('finds prompts in the url, header values, query params and body', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection });

    expect(names).toEqual(expect.arrayContaining(['User id', 'OTP', 'Trace', 'Token']));
  });

  it('finds a prompt in a header inherited from the collection', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection });

    expect(names).toContain('Collection Header');
  });

  it('finds a prompt hidden inside a collection variable value', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection });

    expect(names).toContain('Host');
  });

  it('finds a prompt inside the selected environment', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(names).toContain('Region');
  });

  it('leaves out the environment when none is selected', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection });

    expect(names).not.toContain('Region');
  });

  it('ignores prompts written in a script, which is never interpolated', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(names).not.toContain('Never Asked');
  });

  it('does not ask for a value in a switched-off header, which the header merge drops', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(names).not.toContain('Disabled Header');
    expect(names).toEqual(expect.arrayContaining(['OTP', 'Trace']));
  });

  it('does not ask for a value in a switched-off param, which never reaches the request', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(names).not.toContain('Disabled Param');
    expect(names).toEqual(expect.arrayContaining(['OTP', 'Trace']));
  });

  it('does not ask for a prompt hidden in a variable that a narrower scope overrides', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(names).not.toContain('Host');
    expect(names).toContain('Region');
  });

  it('lists each prompt once', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    expect(new Set(names).size).toBe(names.length);
  });

  it('asks for nothing when a request uses no prompts', async () => {
    const names = await runner.collectPromptVariableNames({ item: plainRequest, collection: { info: {} } as any });

    expect(names).toEqual([]);
  });
});

describe('rows in a form body that the request has switched off', () => {
  it('asks only for the form field that is switched on', async () => {
    const names = await runner.collectPromptVariableNames({ item: formRequest, collection });

    expect(names).toContain('Sent Field');
    expect(names).not.toContain('Skipped Field');
  });

  it('asks only for the multipart field that is switched on', async () => {
    const names = await runner.collectPromptVariableNames({ item: multipartRequest, collection });

    expect(names).toContain('Sent Part');
    expect(names).not.toContain('Skipped Part');
  });

  it('reads only the chosen body when the request offers several, and skips its switched-off row', async () => {
    const names = await runner.collectPromptVariableNames({ item: variantRequest, collection });

    expect(names).toContain('Chosen Field');
    expect(names).not.toContain('Chosen Skipped');
    expect(names).not.toContain('Other Variant');
  });
});

describe('a header the request has switched off', () => {
  const shadowCollection = {
    info: { name: 'Shadow' },
    request: { headers: [{ name: 'X-Token', value: '{{?Collection Token}}' }] },
    items: [
      {
        name: 'Shadowed',
        type: 'http',
        method: 'GET',
        url: 'https://api.example.com/ping',
        headers: [{ name: 'X-Token', value: 'mine', disabled: true }]
      }
    ]
  } as any;

  it('still asks for a value the inherited header needs', async () => {
    const names = await runner.collectPromptVariableNames({
      item: shadowCollection.items[0], collection: shadowCollection
    });

    expect(names).toContain('Collection Token');
  });
});

describe('reusing the work a send has already done', () => {
  it('gives the same answer whether or not the caller hands over a prepared request', async () => {
    const prepared = await runner.prepareRequest(promptedRequest, collection);

    const fromScratch = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });
    const fromPrepared = await runner.collectPromptVariableNames({
      item: promptedRequest, collection, environment, prepared
    });

    expect(fromPrepared).toEqual(fromScratch);
  });

  it('does not merge the collection and folder settings a second time', async () => {
    const prepared = await runner.prepareRequest(promptedRequest, collection);
    const prepare = vi.spyOn(runner, 'prepareRequest');

    await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment, prepared });

    expect(prepare).not.toHaveBeenCalled();
    prepare.mockRestore();
  });
});

describe('matching the desktop scan order', () => {
  it('lists prompts in the desktop order: variables, body, headers, params, auth, url', async () => {
    const names = await runner.collectPromptVariableNames({ item: promptedRequest, collection, environment });

    const position = (name: string) => names.indexOf(name);
    expect(position('Region')).toBeLessThan(position('Token'));
    expect(position('Token')).toBeLessThan(position('OTP'));
    expect(position('OTP')).toBeLessThan(position('Trace'));
    expect(position('Trace')).toBeLessThan(position('User id'));
  });
});

describe('prompts held in a runtime variable', () => {
  it('asks for a prompt stored in a runtime variable by an earlier send', async () => {
    const names = await runner.collectPromptVariableNames({
      item: promptedRequest,
      collection,
      environment,
      runtimeVariables: { token: '{{?Secret}}' }
    });

    expect(names).toContain('Secret');
  });

  it('asks for nothing extra when no runtime variable holds a prompt', async () => {
    const names = await runner.collectPromptVariableNames({
      item: promptedRequest,
      collection,
      environment,
      runtimeVariables: { token: 'already-resolved' }
    });

    expect(names).not.toContain('Secret');
  });
});
