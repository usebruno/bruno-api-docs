# vendored, not ours

Copied from usebruno/bruno at 76595332d5 because the published packages cannot be bundled for a
browser: `@usebruno/converters` ships one ESM file that pulls the node-only root of
`@usebruno/common`, and `@usebruno/filestore` pulls worker threads. The code itself is pure.

- `converters/`  packages/bruno-converters/src/opencollection, minus the reverse direction
- `filestore/`   packages/bruno-filestore/src/formats/bru, parse functions only

Changes from the source: the root `@usebruno/common` import is inlined (one small normaliser),
`@usebruno/lang` parsers are imported by file so the package index (dotenv) stays out, and the
stringify functions are dropped. Everything else is as copied. Delete this directory the day a
browser-safe `@usebruno/converters/opencollection` entry is published.
