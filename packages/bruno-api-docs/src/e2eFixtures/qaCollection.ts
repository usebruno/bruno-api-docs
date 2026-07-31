import type { OpenCollection } from '@opencollection/types';

/**
 * Manual-QA collection for the search palette, mounted at `?fixture=qa`.
 *
 * Built to be awkward on purpose: chains deep enough to elide, folders that
 * share a name across branches, names long enough to fight the row for width,
 * a folder whose own name contains the breadcrumb separator, and folders that
 * count zero or one request. Not used by any automated spec, so it is safe to
 * keep adding hostile cases here.
 */
export const qaFixtureCollection = {
  opencollection: '1.0.0',
  info: { name: 'QA Bench', version: '1.0.0' },
  config: {
    environments: [
      {
        name: 'Dev',
        variables: [
          { name: 'host', value: 'https://api.qa.dev' },
          { name: 'api_key', value: 'dev-key-123' }
        ]
      },
      {
        name: 'Prod',
        variables: [
          { name: 'host', value: 'https://api.qa.com' },
          { name: 'api_key', value: 'prod-key-abc' }
        ]
      }
    ]
  },
  items: [
    {
      name: 'Billing',
      type: 'folder',
      seq: 1,
      items: [
        { name: 'List Invoices', type: 'http', seq: 1, method: 'GET', url: '{{host}}/billing/invoices' },
        {
          name: 'Customers',
          type: 'folder',
          seq: 2,
          items: [
            { name: 'List Customers', type: 'http', seq: 1, method: 'GET', url: '{{host}}/billing/customers' },
            {
              name: 'Payment',
              type: 'folder',
              seq: 2,
              items: [
                {
                  // Shares its name with Products / Users / Auth. Only the
                  // breadcrumb tells the two result rows apart.
                  name: 'Auth',
                  type: 'folder',
                  seq: 1,
                  items: [
                    { name: 'Issue Token', type: 'http', seq: 1, method: 'POST', url: '{{host}}/billing/auth/token' },
                    {
                      name: 'Tokens',
                      type: 'folder',
                      seq: 2,
                      items: [
                        {
                          // Six ancestors by the time you reach a request in
                          // here, so its breadcrumb elides and gets a tooltip.
                          name: 'Legacy v3',
                          type: 'folder',
                          seq: 1,
                          items: [
                            { name: 'Revoke Token', type: 'http', seq: 1, method: 'DELETE', url: '{{host}}/billing/auth/token/:id' },
                            {
                              name: 'Rotate Signing Key For Legacy Token Issuance Endpoint',
                              type: 'http',
                              seq: 2,
                              method: 'POST',
                              url: '{{host}}/billing/auth/token/legacy/rotate-signing-key?scope=all&dry_run=false'
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Products',
      type: 'folder',
      seq: 2,
      items: [
        { name: 'List Products', type: 'http', seq: 1, method: 'GET', url: '{{host}}/products' },
        {
          name: 'Users',
          type: 'folder',
          seq: 2,
          items: [
            {
              // The other Auth. Search "auth" to see both rows at once.
              name: 'Auth',
              type: 'folder',
              seq: 1,
              items: [
                { name: 'Login', type: 'http', seq: 1, method: 'POST', url: '{{host}}/products/auth/login' },
                { name: 'Logout', type: 'http', seq: 2, method: 'POST', url: '{{host}}/products/auth/logout' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Enterprise Customer Identity and Access Management',
      type: 'folder',
      seq: 3,
      items: [
        {
          name: 'Single Sign-On Configuration and Metadata Exchange',
          type: 'folder',
          seq: 1,
          items: [
            {
              name: 'Provisioning and Deprovisioning of Federated Directory Members',
              type: 'folder',
              seq: 1,
              items: [
                {
                  name: 'Synchronise Federated Directory Members With Upstream Identity Provider',
                  type: 'http',
                  seq: 1,
                  method: 'PATCH',
                  url: '{{host}}/enterprise/identity/federated-directory/members/synchronise?provider=okta&include_deactivated=true'
                },
                { name: 'Get SAML Metadata', type: 'http', seq: 2, method: 'GET', url: '{{host}}/enterprise/identity/saml/metadata' }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Edge Cases',
      type: 'folder',
      seq: 4,
      items: [
        // Counts nothing: the row should read "0 requests".
        { name: 'Empty Folder', type: 'folder', seq: 1, items: [] },
        {
          // Scripts are not requests, so this one also reads "0 requests".
          name: 'Scripts Only',
          type: 'folder',
          seq: 2,
          items: [{ name: 'Setup Script', type: 'script', seq: 1, script: 'bru.setVar(\'startedAt\', 1);' }]
        },
        {
          // Holds no request directly; the count comes from its subfolders.
          name: 'Folders Only',
          type: 'folder',
          seq: 3,
          items: [
            {
              name: 'Nested A',
              type: 'folder',
              seq: 1,
              items: [{ name: 'Ping A', type: 'http', seq: 1, method: 'GET', url: '{{host}}/edge/a/ping' }]
            },
            {
              name: 'Nested B',
              type: 'folder',
              seq: 2,
              items: [{ name: 'Ping B', type: 'http', seq: 1, method: 'GET', url: '{{host}}/edge/b/ping' }]
            }
          ]
        },
        {
          // Singular label: "1 request".
          name: 'Exactly One',
          type: 'folder',
          seq: 4,
          items: [{ name: 'Only Child', type: 'http', seq: 1, method: 'PUT', url: '{{host}}/edge/only' }]
        },
        {
          // The folder name itself contains the breadcrumb separator. Its
          // children's chains must still elide by folder, not by " / ".
          name: 'Reports / Archive',
          type: 'folder',
          seq: 5,
          items: [
            { name: 'Download Archive', type: 'http', seq: 1, method: 'GET', url: '{{host}}/edge/reports/archive' },
            {
              name: 'Quarterly',
              type: 'folder',
              seq: 2,
              items: [
                {
                  name: 'Export Consolidated Quarterly Revenue Recognition Report',
                  type: 'http',
                  seq: 1,
                  method: 'POST',
                  url: '{{host}}/edge/reports/archive/quarterly/export'
                }
              ]
            }
          ]
        }
      ]
    },
    { name: 'Health Check', type: 'http', seq: 5, method: 'GET', url: '{{host}}/ping' }
  ]
} as unknown as OpenCollection;

export default qaFixtureCollection;
