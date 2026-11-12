# Contributing to Bruno API Docs

Thanks for your interest. This repo holds the Bruno API Docs renderer: the interactive API documentation site and embedded Bruno Playground that [Bruno](https://www.usebruno.com) generates from a collection. See the [README](./README.md) for what the project is and where it's headed.

## Prerequisites

- Node.js `v22.11.0` (see [`.nvmrc`](./.nvmrc)). With nvm: `nvm use`.
- npm (ships with Node).

## Setup

```bash
git clone https://github.com/usebruno/bruno-api-docs.git
cd bruno-api-docs
npm install
```

## Development

The code lives in three workspaces: `packages/bruno-api-docs` (the docs and the shipped bundle), `packages/bruno-api-playground` (the playground, runner and scripting) and `packages/bruno-shared` (code both use). [ARCHITECTURE.md](./ARCHITECTURE.md) says what goes where.

From the repo root:

| Task | Command |
|------|---------|
| Unit tests, all packages | `npm run test:run` |
| Lint | `npm run lint` |

From `packages/bruno-api-docs`:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Unit tests, this package | `npm run test:run` (watch: `npm test`) |
| E2E tests | `npm run test:e2e` |
| Build | `npm run build` (CDN bundle: `npm run build:standalone`) |

## Making changes

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for how the code is laid out and follow [CODING_STANDARDS.md](./CODING_STANDARDS.md).

1. Open or comment on an issue first for anything beyond a small fix.
2. Create a branch from the active `release/vX.Y.0` branch. Pull requests target that branch, not `main`.
3. Make your change and add or update tests. Run `npm run lint` and `npm run test:run` before pushing; run `npm run test:e2e` when UI behavior changed.
4. Open a pull request against that release branch describing the change and linking the issue.

Continuous integration runs the end-to-end tests on pull requests via GitHub Actions.

## Reporting issues

File issues on [GitHub](https://github.com/usebruno/bruno-api-docs/issues). For bugs, include the smallest collection that reproduces the problem and what you expected to happen.
