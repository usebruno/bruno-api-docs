---
"@usebruno/api-docs": patch
---

UI parity fixes: markdown docs render raw HTML like the app (cleaned with DOMPurify, so scripts, event handlers, styles and forms are removed), The inherited auth badge always names its source, and gRPC requests that inherit an auth mode gRPC cannot use say so and fall back to no auth. The asterisk and other characters now use Inter's contextual forms, as in the app.
