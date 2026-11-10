// Streamable HTTP transport at http://127.0.0.1:$PORT/mcp (PORT defaults to 3000), JSON answers.
//   node dist/http-server.js [clean|broken|empty|crash] [--log <file>] [--echo-auth]
// With MCP_AUTH_TOKEN set, a request without "Authorization: Bearer <MCP_AUTH_TOKEN>" gets 401.
import http from 'node:http';
import { crashIfAsked, handle, options, record } from './fixture.js';

const opts = options(process.argv.slice(2));
crashIfAsked(opts);
const port = Number(process.env.PORT || 3000);
const token = process.env.MCP_AUTH_TOKEN || '';

http
  .createServer((req, res) => {
    if (req.url !== '/mcp') return res.writeHead(404).end();
    if (req.method !== 'POST') return res.writeHead(405).end();
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return res.writeHead(400).end();
      }
      const messages = [].concat(parsed);
      const auth = req.headers.authorization ?? '';
      if (token && auth !== `Bearer ${token}`) {
        // Logged too: "no request reached the server" must count refused ones.
        record(opts, { method: messages[0]?.method, refused: true });
        return res.writeHead(401).end();
      }
      const answers = messages.map((m) => handle(m, opts, auth)).filter(Boolean);
      if (answers.length === 0) return res.writeHead(202).end();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(Array.isArray(parsed) ? answers : answers[0]));
    });
  })
  .listen(port, '127.0.0.1');
