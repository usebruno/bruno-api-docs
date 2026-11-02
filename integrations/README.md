# Bruno API Docs — framework integrations

Serve a Bruno collection as API docs from inside your own app, behind your own auth.

```sh
cd integrations
npm ci
npm run lint
```

A framework that can mount natively takes no path option: the path is its own, like the Express `app.use` path or the Fastify `prefix`. A framework that cannot takes `route`, default `/docs`.
