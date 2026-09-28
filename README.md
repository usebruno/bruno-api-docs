# Bruno API Docs

[![Website](https://img.shields.io/badge/Website-usebruno.com-blue)](https://www.usebruno.com)
[![Docs](https://img.shields.io/badge/Docs-docs.usebruno.com-blue)](https://docs.usebruno.com)
[![X](https://img.shields.io/twitter/follow/use_bruno?style=social&logo=x)](https://twitter.com/use_bruno)
[![Download Bruno](https://img.shields.io/badge/Download_Bruno-Latest-brightgreen)](https://www.usebruno.com/downloads)

**Living API docs, generated from the collection your team runs every day.** No second artifact to write or maintain: every endpoint your readers see is one they can send.

Bruno API Docs renders the collection: the artifact your team actually builds, runs, and tests every day. It captures everything needed to work with an API: working requests with real values filled in, multiple requests for the same endpoint to represent different scenarios, saved request/response examples representing different outcomes (such as success and error states), and the execution context needed to chain requests, share configurations, and automate workflows through variables, scripts, and tests. Readers can explore and customize everything directly in the playground or import it into Bruno, across HTTP, GraphQL, gRPC, and WebSocket. If your API is defined by an OpenAPI spec, Bruno's [OpenAPI Sync](https://docs.usebruno.com/open-api/openapi-sync) keeps the collection aligned as the spec evolves. And if you don't have a spec, the collection documents itself just as well.

## Principles

Same principles as Bruno itself:

- **No account required.** Generate API docs directly from your collection: no Bruno account, login, or cloud service involved.
- **You own the docs.** Docs are generated as static files you can share however you like: GitHub Pages, your own server, an internal portal, or a CDN. Bruno doesn't host or manage them.
- **Git-native.** The collection lives in your repository and the docs are generated from it, so documentation evolves alongside your API and versioning comes naturally with git.
- **Safe by default.** Environments and secrets are excluded from generated output unless you explicitly choose to include them.
- **Open format.** Collections use the [OpenCollection](https://www.opencollection.com) schema, an open specification for API collections.

## Quickstart

If you already have a Bruno collection, open Collection Settings → Documentation → Generate Docs. Bruno generates a single self-contained HTML file that you can share, host, or publish anywhere.

Don't have a Bruno collection yet? Import your API from an [OpenAPI specification](https://docs.usebruno.com/open-api/importOAS) or [another API client](https://docs.usebruno.com/get-started/import-export-data/import-collections), then generate API docs in a single click.

See [Auto-generate documentation](https://docs.usebruno.com/api-docs/auto-generate-docs) in the Bruno docs for more details.


## What you get

- **A full API Reference Docs Site:** every folder, request, and environment gets its own page with a stable shareable URL, prev/next pagination, breadcrumbs, and search with method filters. All from one static file with no server.
- **The Bruno Playground, embedded:** readers edit and send requests right in the docs. Scripting runs in a sandboxed QuickJS environment with a safe-mode `bru.*` API; variables resolve across collection, folder, request, and environment scopes; assertions and tests run like they do in the app. 
- **Request pages built for consumers:** the request definition (method, URL, params, headers, body, auth, examples, code snippets) is separated from its execution context (scripts, variables, assertions, tests).
- **Multi-protocol:** HTTP and GraphQL render and execute in-browser; WebSocket and gRPC render as documentation with execution via Open in Bruno (until execution channels ship, see Roadmap).
- **Light and dark themes** from a token-based design system aligned with the Bruno app, and **Open in Bruno** to hand the collection off to the desktop app for full editing.

## The Bruno ecosystem

| Project | Description | GitHub | Get it |
|---|---|---|---|
| Bruno Desktop | Open-source IDE for exploring and testing APIs; collections live as files in your repo | [usebruno/bruno](https://github.com/usebruno/bruno) | [Download](https://www.usebruno.com/downloads) |
| Bruno CLI | Run collections in CI, generate reports and docs from the command line | [usebruno/bruno](https://github.com/usebruno/bruno/tree/main/packages/bruno-cli) | [npm](https://www.npmjs.com/package/@usebruno/cli) |
| Bruno for VS Code | Work with collections without leaving your editor | [usebruno/bruno-vscode](https://github.com/usebruno/bruno-vscode) | [Marketplace](https://marketplace.visualstudio.com/items?itemName=bruno-api-client.bruno) |
| Bruno for Backstage | Surface and run Bruno collections on Backstage entity pages | *upcoming* | *upcoming* |
| **Bruno API Docs** | The docs renderer and the embedded Bruno Playground | this repo | [Generate in Bruno](https://docs.usebruno.com/api-docs/auto-generate-docs) |
| Bruno Docs Viewer | Hosted viewer that opens a collection fully client-side, live from its public git repo | *upcoming* | *upcoming* |


## Repository layout

| Path | What it is |
|---|---|
| [`packages/bruno-api-docs`](./packages/bruno-api-docs) | The renderer: a React app built as a library and as the **standalone bundle** (`dist-standalone/`), the artifact the Bruno app's generated HTML loads from the CDN. |
| [`examples/`](./examples) | `standalone-html`, how a generated HTML page uses the bundle. `integrations/nodejs`, runnable examples for the framework packages, one folder per framework. |

## Roadmap

The renderer is the shared core for several distribution surfaces, in rough order:

1. **Framework integrations.** Official packages that serve the docs from inside your own app at a route you control (`myapi.com/docs`): Express, NestJS, and Next.js first, then Spring Boot, Laravel, and Rails. Each ships as a separate package in this repo, wrapping the same renderer bundle. Target DX: pass only the collection path, get docs with hot reload on every collection change; everything else (route, environment, theme) is optional.
2. **Hostable static site.** A prerendered multi-page build (real URLs, per-page meta, sitemap, structured data, `llms.txt`) so published docs are indexable by search engines and citable by AI assistants, alongside the existing single-file output.
3. **Playground parity.** Closing the gap with the desktop app: full auth-mode coverage (OAuth2, AWS SigV4, Digest, WSSE, and more), GraphQL/WebSocket/gRPC editors, and user-selectable execution channels for what browsers can't send directly (self-hosted proxy, browser extension, the Bruno desktop app as a local agent, or an explicit opt-in cloud proxy; never a silent default).
4. **Bruno Docs Viewer.** A Bruno-hosted viewer that opens a collection fully client-side: it reads the collection straight from its public git repo and renders it live in the browser, no server processing, no snapshot, no account.

## Development

Prerequisites, dev/test/build commands, and the PR flow are in [contributing.md](./contributing.md). Work happens in `packages/bruno-api-docs`; the test suite includes unit tests (Vitest) and end-to-end tests (Playwright).
