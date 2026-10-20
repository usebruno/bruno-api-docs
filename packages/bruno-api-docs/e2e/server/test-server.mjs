import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 3900);

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': req.headers.origin ?? '*',
  'Access-Control-Allow-Methods': req.headers['access-control-request-method'] ?? '*',
  'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] ?? '*',
  'Access-Control-Expose-Headers': '*',
  'Vary': 'Origin'
});

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const send = (res, status, headers, body = '') => {
  res.writeHead(status, headers);
  res.end(body);
};

const handle = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/cors/deny') return send(res, 200, { 'Content-Type': 'text/plain' }, 'denied');

  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return send(res, 204, cors);

  if (url.pathname === '/health') return send(res, 200, { ...cors, 'Content-Type': 'text/plain' }, 'ok');

  if (url.pathname === '/delay') {
    await new Promise((resolve) => setTimeout(resolve, Number(url.searchParams.get('ms') ?? 5000)));
    return send(res, 200, { ...cors, 'Content-Type': 'text/plain' }, 'done');
  }

  if (url.pathname === '/echo') {
    const echoed = {
      method: req.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      body: await readBody(req)
    };
    return send(res, 200, { ...cors, 'Content-Type': 'application/json' }, JSON.stringify(echoed));
  }

  send(res, 404, { ...cors, 'Content-Type': 'text/plain' }, 'not found');
};

createServer((req, res) => handle(req, res).catch(() => res.destroy()))
  .listen(port, '127.0.0.1', () => console.log(`test server on http://127.0.0.1:${port}`));
