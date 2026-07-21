# bruno-api-docs

`@opencollection/docs` — an interactive API documentation site and request playground for the [OpenCollection](https://www.opencollection.com) format.

Point it at an OpenCollection and it renders a browsable docs site: a sidebar of requests, per-request documentation (params, headers, body, auth, scripts, assertions), and a live playground that sends the request and shows the response.

## Install

```bash
npm install @opencollection/docs
```

## Usage

It ships three ways:

- **React component** — import `OpenCollection` and pass it a collection.
- **Standalone bundle** — a self-contained JS/CSS build (`dist-standalone/`) for dropping into any page, served from the CDN.
- **Express / server entry** — render the docs from a Node server.

See [`examples/`](./examples) for a working setup of each (`react`, `standalone-html`, `express-server`).

## Development

Work happens in `packages/oc-docs`. See [contributing.md](./contributing.md) for setup, dev/test/build commands, and the PR flow.
