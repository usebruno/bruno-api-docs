import type { OpenCollection } from '@opencollection/types';

/**
 * Small collections mounted from `?fixture=general` (and the general-* variants).
 * Kept separate from the sample collection so environment counts, the version,
 * and the name can be controlled per scenario.
 */

const DEV_HOST = 'https://api.dev.example.com';
const PROD_HOST = 'https://api.prod.example.com';
const STAGING_HOST = 'https://staging.example.com';
const SECRET = 'super-secret-token';
const SPECIAL = 'a<b>&"\'ü';
const ONLY_IN_DEV = 'from-dev';
const LONG_NAME = 'Northwind Partner Integration Collection for External Settlement and Reconciliation Services';

const secret = (name: string, value: string) => ({ name, value, secret: true });

const request = (
  name: string,
  url: string,
  extras: Record<string, unknown> = {}
) => ({
  name,
  type: 'http',
  seq: 1,
  method: 'GET',
  url,
  ...extras
});

/**
 * Two environments whose host values differ, plus a secret, a special-character
 * value, and a variable that exists only in Dev.
 */
export const generalFixtureCollection = {
  opencollection: '1.0.0',
  info: { name: 'General Fixture', version: '1.0.0' },
  config: {
    environments: [
      {
        name: 'Dev',
        variables: [
          { name: 'host', value: DEV_HOST },
          { name: 'special', value: SPECIAL },
          { name: 'onlyInDev', value: ONLY_IN_DEV },
          secret('apiToken', SECRET)
        ]
      },
      {
        name: 'Prod',
        variables: [
          { name: 'host', value: PROD_HOST },
          { name: 'special', value: SPECIAL },
          secret('apiToken', SECRET)
        ]
      }
    ]
  },
  items: [
    request('Alpha', '{{host}}/alpha?q={{special}}&m={{onlyInDev}}&t={{apiToken}}', {
      headers: [
        { name: 'Authorization', value: 'Bearer {{apiToken}}' },
        { name: 'X-Host', value: '{{host}}' },
        { name: 'X-Note', value: '{{special}}' }
      ],
      body: {
        type: 'json',
        data: '{\n  "host": "{{host}}",\n  "token": "{{apiToken}}",\n  "note": "{{special}}"\n}'
      }
    }),
    request('Beta', '{{host}}/beta', { seq: 2 })
  ]
} as unknown as OpenCollection;

/** No environments selected, so the switcher and Environments page show their empty states. */
export const generalNoEnvCollection = {
  opencollection: '1.0.0',
  info: { name: 'Empty Environments', version: '1.0.0' },
  config: { environments: [] },
  items: [request('Ping', 'https://example.com/ping')]
} as unknown as OpenCollection;

/** A single environment that still resolves variables. */
export const generalOneEnvCollection = {
  opencollection: '1.0.0',
  info: { name: 'Single Environment', version: '1.0.0' },
  config: {
    environments: [
      { name: 'Staging', variables: [{ name: 'host', value: STAGING_HOST }] }
    ]
  },
  items: [request('Ping', '{{host}}/ping')]
} as unknown as OpenCollection;

/** A name long enough to truncate inside the brand cluster. */
export const generalLongNameCollection = {
  opencollection: '1.0.0',
  info: { name: LONG_NAME, version: '9.9.9' },
  config: {
    environments: [{ name: 'Dev', variables: [{ name: 'host', value: DEV_HOST }] }]
  },
  items: [request('Ping', '{{host}}/ping')]
} as unknown as OpenCollection;

/** Version omitted, so neither the bar nor Overview should show one. */
export const generalNoVersionCollection = {
  opencollection: '1.0.0',
  info: { name: 'Versionless API' },
  config: {
    environments: [{ name: 'Dev', variables: [{ name: 'host', value: DEV_HOST }] }]
  },
  items: [request('Ping', '{{host}}/ping')]
} as unknown as OpenCollection;
