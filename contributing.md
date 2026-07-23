# Contributing to bruno-api-docs

Thanks for your interest. This repo holds `@opencollection/docs`, the interactive API documentation site and request playground for the [OpenCollection](https://www.opencollection.com) format.

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

Run these from `packages/oc-docs`:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Unit tests | `npm run test:run` (watch: `npm test`) |
| E2E tests | `npm run test:e2e` |
| Lint | `npm run lint` |
| Build | `npm run build` (CDN bundle: `npm run build:standalone`) |

## Making changes

1. Open or comment on an issue first for anything beyond a small fix.
2. Create a branch from `main`.
3. Make your change and add or update tests. Run `npm run lint` and `npm run test:run` before pushing; run `npm run test:e2e` when UI behavior changed.
4. Open a pull request against `main` describing the change and linking the issue.

Continuous integration runs the end-to-end tests on pull requests via GitHub Actions.

## Reporting issues

File issues on [GitHub](https://github.com/usebruno/bruno-api-docs/issues). For bugs, include the smallest collection that reproduces the problem and what you expected to happen.
